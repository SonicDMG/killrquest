import type { Hero, Monster, Ability, CombatLogEntry } from "./types";

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function parseDice(expr: string): { count: number; sides: number } {
  const normalized = expr.startsWith("d") ? "1" + expr : expr;
  const [countStr, sidesStr] = normalized.split("d");
  return { count: parseInt(countStr, 10), sides: parseInt(sidesStr, 10) };
}

function rollDice(expr: string): number {
  const { count, sides } = parseDice(expr);
  let total = 0;
  for (let i = 0; i < count; i++) total += rollDie(sides);
  return total;
}

interface AttackResult {
  hit: boolean;
  damage: number;
  roll: number;
  total: number;
}

function resolveAttack(
  attackBonus: number,
  ac: number,
  damageDie: string
): AttackResult {
  const roll = rollDie(20);
  const total = roll + attackBonus;
  const hit = total >= ac;
  const damage = hit ? rollDice(damageDie) : 0;
  return { hit, damage, roll, total };
}

function pickAbility(
  combatant: Hero | Monster,
  currentHp: number
): Ability | null {
  const abilities = combatant.abilities ?? [];
  if (abilities.length === 0) return null;

  const hpPct = currentHp / combatant.maxHitPoints;
  if (hpPct < 0.3) {
    const healAbility = abilities.find((a) => a.type === "healing");
    if (healAbility) return healAbility;
  }

  const attackAbilities = abilities.filter((a) => a.type === "attack");
  if (attackAbilities.length === 0) return null;
  return attackAbilities[Math.floor(Math.random() * attackAbilities.length)];
}

export function resolveTurn(
  turn: number,
  attacker: Hero | Monster,
  attackerHp: number,
  defender: Hero | Monster,
  defenderHp: number,
  attackerIsHero: boolean
): CombatLogEntry {
  const ability = pickAbility(attacker, attackerHp);

  let hit = false;
  let damage: number | undefined;
  let healing: number | undefined;
  let roll = 0;
  let total = 0;
  const ac = defender.armorClass;

  let newAttackerHp = attackerHp;
  let newDefenderHp = defenderHp;

  if (ability?.type === "healing") {
    const healAmt = rollDice(ability.healingDice ?? "1d4");
    newAttackerHp = Math.min(attacker.maxHitPoints, attackerHp + healAmt);
    healing = healAmt;
    hit = true;
    roll = 0;
    total = 0;
  } else {
    const damageDie =
      ability?.damageDice ?? attacker.damageDie;
    const result = resolveAttack(attacker.attackBonus, ac, damageDie);
    hit = result.hit;
    damage = result.damage;
    roll = result.roll;
    total = result.total;
    if (hit) newDefenderHp = Math.max(0, defenderHp - (damage ?? 0));
  }

  const heroHp = attackerIsHero ? newAttackerHp : newDefenderHp;
  const monsterHp = attackerIsHero ? newDefenderHp : newAttackerHp;

  return {
    turn,
    attacker: attacker.name,
    target: ability?.type === "healing" ? attacker.name : defender.name,
    roll,
    total,
    ac,
    hit,
    damage,
    healing,
    abilityUsed: ability?.name,
    resultHp: { hero: heroHp, monster: monsterHp },
  };
}

export function runCombat(hero: Hero, monster: Monster): CombatLogEntry[] {
  const log: CombatLogEntry[] = [];
  let heroHp = hero.hitPoints;
  let monsterHp = monster.hitPoints;
  let turn = 1;
  const MAX_TURNS = 100;

  while (heroHp > 0 && monsterHp > 0 && turn <= MAX_TURNS) {
    // Hero attacks
    const heroEntry = resolveTurn(turn, hero, heroHp, monster, monsterHp, true);
    heroHp = heroEntry.resultHp.hero;
    monsterHp = heroEntry.resultHp.monster;
    log.push(heroEntry);

    if (monsterHp <= 0) break;

    // Monster attacks
    const monsterEntry = resolveTurn(turn, monster, monsterHp, hero, heroHp, false);
    heroHp = monsterEntry.resultHp.hero;
    monsterHp = monsterEntry.resultHp.monster;
    log.push(monsterEntry);

    turn++;
  }

  return log;
}
