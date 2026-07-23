export interface SearchHit<T> {
  doc: T;
  similarity: number | null; // 0–1, null when browsing without a query
}

export interface Ability {
  name: string;
  type: "attack" | "healing";
  damageDice?: string;
  healingDice?: string;
  attackRoll?: boolean;
  description: string;
}

export interface Hero {
  _id: string;
  name: string;
  class?: string;
  hitPoints: number;
  maxHitPoints: number;
  armorClass: number;
  attackBonus: number;
  damageDie: string;
  abilities: Ability[];
  description: string;
  imageUrl: string;
  imagePosition?: { offsetX: number; offsetY: number };
  color?: string;
  isDefault?: boolean;
}

export interface Monster {
  _id: string;
  name: string;
  hitPoints: number;
  maxHitPoints: number;
  armorClass: number;
  attackBonus: number;
  damageDie: string;
  abilities: Ability[];
  description: string;
  imageUrl: string;
  imagePosition?: { offsetX: number; offsetY: number };
  color?: string;
}

export interface CombatLogEntry {
  turn: number;
  attacker: string;
  target: string;
  roll: number;
  total: number;
  ac: number;
  hit: boolean;
  damage?: number;
  healing?: number;
  abilityUsed?: string;
  resultHp: { hero: number; monster: number };
}

export interface BattleRecord {
  _id?: string;
  foughtAt: string;
  hero: string;
  heroClass: string | null;
  monster: string;
  winner: string;
  turns: number;
  heroFinalHp: number;
  heroMaxHp: number;
  monsterFinalHp: number;
  monsterMaxHp: number;
  abilitiesUsed: string[];
  $vectorize: string;
}

export type ChatMessageRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatMessageRole;
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
}

export type Provider = "ollama" | "openai" | "openrouter";

export interface ConversationDoc {
  _id: string;
  createdAt: string;
  label: string;
  provider: Provider;
  model: string;
  // Stateless providers store full message history
  messages?: ChatMessage[];
  // OpenAI Responses API — stores last response ID only
  previousResponseId?: string;
}
