/**
 * migrate-to-vectorize.mjs
 *
 * Creates heroes_v2 and monsters_v2 with:
 *   - vectorize: nvidia/nv-embedqa-e5-v5 (no API key required)
 *   - lexical: enabled (standard analyzer)
 *   - rerank: nvidia/llama-3.2-nv-rerankqa-1b-v2
 *
 * Then copies all docs from heroes / monsters, adding a $vectorize field
 * built from each character's name, class/type, description, and abilities.
 *
 * Usage:
 *   node scripts/migrate-to-vectorize.mjs
 */

import { DataAPIClient } from "@datastax/astra-db-ts";
import { readFileSync } from "fs";

// Load .env.local manually (no dotenv dependency needed)
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split("=").map((s) => s.trim()))
);

const TOKEN = env.ASTRA_DB_TOKEN;
const ENDPOINT = env.ASTRA_DB_ENDPOINT;
const KEYSPACE = env.ASTRA_DB_KEYSPACE ?? "default_keyspace";

if (!TOKEN || !ENDPOINT) {
  console.error("Missing ASTRA_DB_TOKEN or ASTRA_DB_ENDPOINT in .env.local");
  process.exit(1);
}

const COLLECTION_DEF = {
  vector: {
    service: {
      provider: "nvidia",
      modelName: "nvidia/nv-embedqa-e5-v5",
    },
  },
  lexical: { enabled: true, analyzer: "standard" },
  rerank: {
    enabled: true,
    service: {
      provider: "nvidia",
      modelName: "nvidia/llama-3.2-nv-rerankqa-1b-v2",
    },
  },
};

/** Build a rich text string for embedding from a hero or monster doc */
function toVectorizeText(doc) {
  const parts = [doc.name];
  if (doc.class) parts.push(doc.class);
  if (doc.description) parts.push(doc.description);
  if (Array.isArray(doc.abilities)) {
    for (const a of doc.abilities) {
      parts.push(`${a.name}: ${a.description}`);
    }
  }
  return parts.join(". ");
}

async function migrateCollection(db, srcName, dstName) {
  console.log(`\n--- ${srcName} → ${dstName} ---`);

  // Drop + recreate destination
  try {
    await db.dropCollection(dstName);
    console.log(`  Dropped existing ${dstName}`);
  } catch {
    // Didn't exist, fine
  }

  await db.createCollection(dstName, { ...COLLECTION_DEF });
  console.log(`  Created ${dstName} with vectorize + lexical + rerank`);

  const src = db.collection(srcName);
  const dst = db.collection(dstName);

  const docs = await src.find({}).toArray();
  console.log(`  Read ${docs.length} docs from ${srcName}`);

  // Insert in batches of 20 (vectorize calls can be slow)
  const BATCH = 20;
  let inserted = 0;
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH).map((doc) => ({
      ...doc,
      $vectorize: toVectorizeText(doc),
    }));
    await dst.insertMany(batch);
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${docs.length}`);
  }

  console.log(`  ✓ Done — ${inserted} docs migrated`);
}

async function main() {
  const client = new DataAPIClient(TOKEN);
  const db = client.db(ENDPOINT, { keyspace: KEYSPACE });

  await migrateCollection(db, "heroes", "heroes_v2");
  await migrateCollection(db, "monsters", "monsters_v2");

  console.log("\n✅ Migration complete. Update ASTRA_DB_HEROES_COLLECTION and ASTRA_DB_MONSTERS_COLLECTION in .env.local (or just update astra.ts).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
