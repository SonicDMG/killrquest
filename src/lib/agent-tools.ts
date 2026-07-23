import { heroesCollection, monstersCollection } from "./astra";
import { runCombat } from "./combat";
import type { Hero, Monster } from "./types";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPT = `You are the KillrQuest Game Master — an expert on every hero and monster in the roster.

You have three tools at your disposal:
- search_heroes: find heroes by semantic query (class, abilities, lore)
- search_monsters: find monsters by semantic query
- simulate_battle: pit a named hero against a named monster and get the outcome

When a user asks about a hero or monster, always call the appropriate search tool first so your answer is grounded in real data. When asked who would win a fight, call simulate_battle — never guess.

Keep responses concise and flavourful. Use game-master tone: dramatic but informative. Refer to characters by name.`;

// ---------------------------------------------------------------------------
// OpenAI tool definitions
// ---------------------------------------------------------------------------

export const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_heroes",
      description:
        "Search the hero roster by semantic query. Returns the top matching heroes with their stats and abilities.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              'Natural-language query, e.g. "powerful healer" or "magic user with fire spells"',
          },
          limit: {
            type: "number",
            description: "Max results to return (default 3, max 10)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_monsters",
      description:
        "Search the monster roster by semantic query. Returns the top matching monsters with their stats and abilities.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              'Natural-language query, e.g. "undead creature" or "fast low-HP monster"',
          },
          limit: {
            type: "number",
            description: "Max results to return (default 3, max 10)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "simulate_battle",
      description:
        "Simulate a battle between a named hero and a named monster using the game engine. Returns the winner, turn count, final HP values, and key ability uses.",
      parameters: {
        type: "object",
        properties: {
          hero_name: {
            type: "string",
            description: "Exact or partial name of the hero",
          },
          monster_name: {
            type: "string",
            description: "Exact or partial name of the monster",
          },
        },
        required: ["hero_name", "monster_name"],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

function trimCharacter(doc: Hero | Monster) {
  return {
    name: doc.name,
    class: (doc as Hero).class ?? null,
    description: doc.description,
    hitPoints: doc.maxHitPoints,
    armorClass: doc.armorClass,
    attackBonus: doc.attackBonus,
    damageDie: doc.damageDie,
    abilities: doc.abilities.map((a) => ({
      name: a.name,
      type: a.type,
      description: a.description,
    })),
  };
}

async function searchHeroes(query: string, limit = 3) {
  const docs = await heroesCollection
    .find({}, { sort: { $vectorize: query }, limit: Math.min(limit, 10), includeSimilarity: true })
    .toArray();
  return docs.map(trimCharacter);
}

async function searchMonsters(query: string, limit = 3) {
  const docs = await monstersCollection
    .find({}, { sort: { $vectorize: query }, limit: Math.min(limit, 10), includeSimilarity: true })
    .toArray();
  return docs.map(trimCharacter);
}

async function simulateBattle(heroName: string, monsterName: string) {
  const lowerHero = heroName.toLowerCase();
  const lowerMonster = monsterName.toLowerCase();

  const [allHeroes, allMonsters] = await Promise.all([
    heroesCollection.find({}, { limit: 200 }).toArray(),
    monstersCollection.find({}, { limit: 200 }).toArray(),
  ]);

  const heroDoc = allHeroes.find((h) => h.name.toLowerCase().includes(lowerHero)) ?? null;
  const monsterDoc = allMonsters.find((m) => m.name.toLowerCase().includes(lowerMonster)) ?? null;

  if (!heroDoc) return { error: `Hero not found: "${heroName}"` };
  if (!monsterDoc) return { error: `Monster not found: "${monsterName}"` };

  const log = runCombat(heroDoc, monsterDoc);
  const last = log[log.length - 1];
  const heroFinalHp = last?.resultHp.hero ?? 0;
  const monsterFinalHp = last?.resultHp.monster ?? 0;
  const winner = heroFinalHp > 0 ? heroDoc.name : monsterDoc.name;
  const abilitiesUsed = Array.from(new Set(log.map((e) => e.abilityUsed).filter(Boolean)));

  return {
    hero: heroDoc.name,
    monster: monsterDoc.name,
    winner,
    turns: Math.ceil(log.length / 2),
    heroFinalHp,
    monsterFinalHp,
    abilitiesUsed,
  };
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  if (name === "search_heroes") {
    return searchHeroes(args.query as string, args.limit as number | undefined);
  }
  if (name === "search_monsters") {
    return searchMonsters(args.query as string, args.limit as number | undefined);
  }
  if (name === "simulate_battle") {
    return simulateBattle(args.hero_name as string, args.monster_name as string);
  }
  return { error: `Unknown tool: ${name}` };
}
