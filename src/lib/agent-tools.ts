import { heroesCollection, monstersCollection, battlesCollection } from "./astra";
import type { Hero, Monster } from "./types";

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPT = `You are the KillrQuest Game Master — a dramatic, authoritative narrator for a fantasy battle roster.

You have three tools:
- search_heroes: find heroes by name, class, or abilities
- search_monsters: find monsters by name or traits
- search_battles: find past battles by hero name, monster name, or outcome

When a user asks about a hero, call search_heroes. When they ask about a monster, call search_monsters. When asked who would win a fight, call both search tools and also search_battles for historical context, then reason through the matchup using stats and past outcomes. When asked about battle history or patterns, call search_battles.

Never simulate or guess — always ground your answer in the data the tools return.

## Response formatting

Format every response in clean, readable Markdown:

- Use **bold** for character names, ability names, and key stats on first mention.
- Use a \`##\` heading to title your response (e.g. \`## Sir Percival vs. The Keyboard Monster\`).
- Use a \`>\` blockquote for a one-sentence dramatic flavour line at the top or bottom.
- Use a short bullet list when comparing two or more stats or outcomes — never inline a wall of numbers.
- Keep prose to 2–4 sentences. Be vivid but concise.
- Never output raw JSON, stat tables, or turn-by-turn logs.`;

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
      name: "search_battles",
      description:
        "Search past battles by semantic query. Returns matching battle records with hero, monster, winner, turns, and HP outcomes.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              'Natural-language query, e.g. "battles involving Sir Percival" or "heroes that beat the Keyboard Monster"',
          },
          limit: {
            type: "number",
            description: "Max results to return (default 5, max 20)",
          },
        },
        required: ["query"],
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

async function searchBattles(query: string, limit = 5) {
  const docs = await battlesCollection
    .find({}, { sort: { $vectorize: query }, limit: Math.min(limit, 20), includeSimilarity: true })
    .toArray();
  return docs.map((d) => ({
    foughtAt: d.foughtAt,
    hero: d.hero,
    heroClass: d.heroClass,
    monster: d.monster,
    winner: d.winner,
    turns: d.turns,
    heroFinalHp: d.heroFinalHp,
    heroMaxHp: d.heroMaxHp,
    monsterFinalHp: d.monsterFinalHp,
    monsterMaxHp: d.monsterMaxHp,
    abilitiesUsed: d.abilitiesUsed,
  }));
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
  if (name === "search_battles") {
    return searchBattles(args.query as string, args.limit as number | undefined);
  }
  return { error: `Unknown tool: ${name}` };
}
