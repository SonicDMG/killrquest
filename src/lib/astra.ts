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

// Create conversations_v1 if it doesn't exist yet (plain collection, no vectorizer)
let conversationsReady: Promise<void> | null = null;
export function ensureConversationsCollection(): Promise<void> {
  if (!conversationsReady) {
    conversationsReady = db
      .createCollection("conversations_v1")
      .then(() => {})
      .catch((e) => {
        console.error("[astra] failed to create conversations_v1:", e);
        conversationsReady = null; // allow retry
      });
  }
  return conversationsReady;
}
