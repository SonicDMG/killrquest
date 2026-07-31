import { DataAPIClient } from "@datastax/astra-db-ts";
import type { Hero, Monster, BattleRecord, ConversationDoc } from "./types";

const client = new DataAPIClient(process.env.ASTRA_DB_TOKEN!);
const db = client.db(process.env.ASTRA_DB_ENDPOINT!, {
  keyspace: process.env.ASTRA_DB_KEYSPACE ?? "default_keyspace",
});

export const heroesCollection = db.collection<Hero>("heroes_v2");
export const monstersCollection = db.collection<Monster>("monsters_v2");
export const battlesCollection = db.collection<BattleRecord>("battles_v1");
export const conversationsCollection = db.collection<ConversationDoc>("conversations_v1");

// Ensure conversations_v1 exists — checked once per process via a cached Promise.
// Uses listCollections (read op) to avoid the DDL latency of createCollection when
// the collection already exists.
let conversationsReady: Promise<void> | null = null;
export function ensureConversationsCollection(): Promise<void> {
  if (!conversationsReady) {
    conversationsReady = (async () => {
      const names: string[] = await db.listCollections({ nameOnly: true }) as unknown as string[];
      if (!names.includes("conversations_v1")) {
        await db.createCollection("conversations_v1");
      }
    })().catch((e: unknown) => {
      console.error("[astra] failed to ensure conversations_v1:", e);
      conversationsReady = null; // allow retry on next request
    }) as Promise<void>;
  }
  return conversationsReady!;
}
