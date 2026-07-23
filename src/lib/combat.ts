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

/** Pick a random living target from the opposing side */
function pickTarget<T extends { _id: string }>(
  pool: T[],
  hpArr: number[]
): number {
  const alive = pool
    .map((_, i) => i)
    .filter((i) => hpArr[i] > 0);
  if (alive.length === 0) return -1;
  return alive[Math.floor(Math.random() * alive.length)];
}

export function runRosterCombat(
  heroes: Hero[],
  monsters: Monster[]
): CombatLogEntry[] {
  const log: CombatLogEntry[] = [];
  const heroHp = heroes.map((h) => h.hitPoints);
  const monsterHp = monsters.map((m) => m.hitPoints);
  let turn = 1;
  const MAX_TURNS = 200;

  while (turn <= MAX_TURNS) {
    const heroesAlive = heroHp.some((hp) => hp > 0);
    const monstersAlive = monsterHp.some((hp) => hp > 0);
    if (!heroesAlive || !monstersAlive) break;

    // ── Hero phase: each living hero acts ──────────────────────────────────
    for (let hi = 0; hi < heroes.length; hi++) {
      if (heroHp[hi] <= 0) continue;
      if (!monsterHp.some((hp) => hp > 0)) break;

      const hero = heroes[hi];
      const ability = pickAbility(hero, heroHp[hi]);

      let hit = false, damage: number | undefined, healing: number | undefined;
      let roll = 0, total = 0, ac = 0;
      let targetIdx = -1;

      if (ability?.type === "healing") {
        // Heals self
        const healAmt = rollDice(ability.healingDice ?? "1d4");
        heroHp[hi] = Math.min(hero.maxHitPoints, heroHp[hi] + healAmt);
        healing = healAmt;
        hit = true;
        targetIdx = hi;
      } else {
        targetIdx = pickTarget(monsters, monsterHp);
        if (targetIdx === -1) break;
        const target = monsters[targetIdx];
        ac = target.armorClass;
        const damageDie = ability?.damageDice ?? hero.damageDie;
        const result = resolveAttack(hero.attackBonus, ac, damageDie);
        hit = result.hit;
        damage = result.damage;
        roll = result.roll;
        total = result.total;
        if (hit) monsterHp[targetIdx] = Math.max(0, monsterHp[targetIdx] - damage);
      }

      log.push({
        turn,
        attacker: hero.name,
        attackerIdx: hi,
        attackerIsHero: true,
        target: ability?.type === "healing" ? hero.name : monsters[targetIdx].name,
        targetIdx,
        roll, total, ac, hit, damage, healing,
        abilityUsed: ability?.name,
        resultHp: { heroes: [...heroHp], monsters: [...monsterHp] },
      });

      if (!monsterHp.some((hp) => hp > 0)) break;
    }

    if (!monsterHp.some((hp) => hp > 0)) break;

    // ── Monster phase: each living monster acts ────────────────────────────
    for (let mi = 0; mi < monsters.length; mi++) {
      if (monsterHp[mi] <= 0) continue;
      if (!heroHp.some((hp) => hp > 0)) break;

      const monster = monsters[mi];
      const ability = pickAbility(monster, monsterHp[mi]);

      let hit = false, damage: number | undefined, healing: number | undefined;
      let roll = 0, total = 0, ac = 0;
      let targetIdx = -1;

      if (ability?.type === "healing") {
        const healAmt = rollDice(ability.healingDice ?? "1d4");
        monsterHp[mi] = Math.min(monster.maxHitPoints, monsterHp[mi] + healAmt);
        healing = healAmt;
        hit = true;
        targetIdx = mi;
      } else {
        targetIdx = pickTarget(heroes, heroHp);
        if (targetIdx === -1) break;
        const target = heroes[targetIdx];
        ac = target.armorClass;
        const damageDie = ability?.damageDice ?? monster.damageDie;
        const result = resolveAttack(monster.attackBonus, ac, damageDie);
        hit = result.hit;
        damage = result.damage;
        roll = result.roll;
        total = result.total;
        if (hit) heroHp[targetIdx] = Math.max(0, heroHp[targetIdx] - damage);
      }

      log.push({
        turn,
        attacker: monster.name,
        attackerIdx: mi,
        attackerIsHero: false,
        target: ability?.type === "healing" ? monster.name : heroes[targetIdx].name,
        targetIdx,
        roll, total, ac, hit, damage, healing,
        abilityUsed: ability?.name,
        resultHp: { heroes: [...heroHp], monsters: [...monsterHp] },
      });

      if (!heroHp.some((hp) => hp > 0)) break;
    }

    turn++;
  }

  return log;
}
