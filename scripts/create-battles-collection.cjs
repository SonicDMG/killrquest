const { DataAPIClient } = require("@datastax/astra-db-ts");
const fs = require("fs");

// Parse .env.local manually
const env = fs.readFileSync(".env.local", "utf-8");
const vars = Object.fromEntries(
  env.split("\n").filter(l => l.includes("=")).map(l => {
    const [k, ...v] = l.split("=");
    return [k.trim(), v.join("=").trim()];
  })
);

const client = new DataAPIClient(vars.ASTRA_DB_TOKEN);
const db = client.db(vars.ASTRA_DB_ENDPOINT, {
  keyspace: vars.ASTRA_DB_KEYSPACE ?? "default_keyspace",
});

db.createCollection("battles_v1", {
  defaultId: { type: "uuid" },
  vector: { service: { provider: "nvidia", modelName: "NV-Embed-QA" } },
})
  .then(() => { console.log("battles_v1 created"); process.exit(0); })
  .catch((e) => {
    const code = e?.errorDescriptors?.[0]?.errorCode;
    if (code === "EXISTING_COLLECTION_DIFFERENT_SETTINGS" || e?.message?.includes("already exists")) {
      console.log("battles_v1 already exists — nothing to do");
      process.exit(0);
    }
    console.error("Error:", e?.message ?? e);
    process.exit(1);
  });
