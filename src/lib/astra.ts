import { DataAPIClient } from "@datastax/astra-db-ts";
import type { Hero, Monster } from "./types";

const client = new DataAPIClient(process.env.ASTRA_DB_TOKEN!);
const db = client.db(process.env.ASTRA_DB_ENDPOINT!, {
  keyspace: process.env.ASTRA_DB_KEYSPACE ?? "default_keyspace",
});

export const heroesCollection = db.collection<Hero>("heroes");
export const monstersCollection = db.collection<Monster>("monsters");
