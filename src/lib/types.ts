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
