import type { AttributeKey, Attributes, Character, Occupation, Ruleset, SkillDefinition } from '../types';

/** All characteristic inputs are final values, after age adjustments. */
export function getSkillBase(skill: SkillDefinition, character: Character, ruleset?: Ruleset): number {
  const override = ruleset?.skillBaseOverrides?.[skill.id];
  if (override !== undefined) return override;
  if (skill.base === 'DEX/2') return Math.floor(character.attributes.DEX / 2);
  if (skill.base === 'APP/5') return Math.floor(character.attributes.APP / 5);
  if (skill.base === 'EDU') return character.attributes.EDU;
  return skill.base;
}

export function getSkillTotal(skill: SkillDefinition, character: Character, ruleset?: Ruleset): number {
  const allocation = character.skills[skill.id];
  return getSkillBase(skill, character, ruleset) + (allocation ? allocation.occupation + allocation.personal + allocation.growth : 0);
}

export function derive(character: Character, occupation?: Occupation) {
  const { STR, CON, SIZ, DEX, INT, POW, EDU } = character.attributes;
  const combined = STR + SIZ;
  const [build, damageBonus]: [number, string] = combined < 65 ? [-2, '−2']
    : combined < 85 ? [-1, '−1'] : combined < 125 ? [0, '0']
    : combined < 165 ? [1, '+1D4'] : combined < 205 ? [2, '+1D6']
    : [3 + Math.floor((combined - 205) / 80), `+${2 + Math.floor((combined - 205) / 80)}D6`];
  const basicMove = STR < SIZ && DEX < SIZ ? 7 : STR > SIZ && DEX > SIZ ? 9 : 8;
  const agePenalty = character.age < 40 ? 0 : Math.min(5, Math.floor(character.age / 10) - 3);
  const mythos = character.skills['cthulhu-mythos'] ?? character.skills.cthulhuMythos ?? character.skills.mythos;
  const mythosTotal = mythos ? mythos.occupation + mythos.personal + mythos.growth : 0;
  const maxSan = Math.max(0, 99 - mythosTotal);
  const other = occupation?.formula.other ?? [];
  const otherValue = Math.max(0, ...other.map(key => character.attributes[key as AttributeKey] ?? 0));
  const allocations = Object.values(character.skills);
  return {
    hp: Math.floor((CON + SIZ) / 10),
    mp: Math.floor(POW / 5),
    san: Math.min(POW, maxSan),
    maxSan,
    move: Math.max(1, basicMove - agePenalty),
    build,
    damageBonus,
    occupationPoints: occupation ? EDU * occupation.formula.edu + otherValue * (occupation.formula.factor ?? 0) : EDU * 4,
    personalPoints: INT * 2,
    occupationSpent: allocations.reduce((sum, allocation) => sum + allocation.occupation, 0),
    personalSpent: allocations.reduce((sum, allocation) => sum + allocation.personal, 0),
  };
}

function die(sides: number): number { return 1 + Math.floor(Math.random() * sides); }
function dice(count: number, sides: number): number { return Array.from({ length: count }, () => die(sides)).reduce((a, b) => a + b, 0); }

export function rollAttributes(): Attributes {
  return {
    STR: dice(3, 6) * 5, CON: dice(3, 6) * 5, SIZ: (dice(2, 6) + 6) * 5,
    DEX: dice(3, 6) * 5, APP: dice(3, 6) * 5, INT: (dice(2, 6) + 6) * 5,
    POW: dice(3, 6) * 5, EDU: (dice(2, 6) + 6) * 5,
  };
}

export function rollLuck(): number { return dice(3, 6) * 5; }

function ageModifiers(age: number) {
  if (age < 15 || age > 89) throw new Error('标准建卡年龄为 15–89 岁；其他年龄请与守秘人约定。');
  if (age < 20) return { deduction: 5, appearance: 0, educationChecks: 0 };
  if (age < 40) return { deduction: 0, appearance: 0, educationChecks: 1 };
  if (age < 50) return { deduction: 5, appearance: 5, educationChecks: 2 };
  if (age < 60) return { deduction: 10, appearance: 10, educationChecks: 3 };
  if (age < 70) return { deduction: 20, appearance: 15, educationChecks: 4 };
  if (age < 80) return { deduction: 40, appearance: 20, educationChecks: 4 };
  return { deduction: 80, appearance: 25, educationChecks: 4 };
}

/** Explicit one-time creation action. Never invoked during ordinary recomputation. */
export function applyAge(character: Character): Character {
  const result = structuredClone(character);
  const { deduction, appearance, educationChecks } = ageModifiers(character.age);
  const candidates: AttributeKey[] = character.age < 20 ? ['STR', 'SIZ'] : ['STR', 'CON', 'DEX'];
  // The rules permit the player to distribute this total. This button chooses the
  // currently highest characteristic each time; the final values remain editable.
  for (let n = 0; n < deduction; n++) {
    const key = candidates.reduce((best, candidate) => result.attributes[candidate] > result.attributes[best] ? candidate : best);
    if (result.attributes[key] <= 1) throw new Error('属性太低，无法完整分配年龄减值；请手动按规则调整。');
    result.attributes[key] -= 1;
  }
  result.attributes.APP = Math.max(1, result.attributes.APP - appearance);
  if (character.age < 20) {
    result.attributes.EDU = Math.max(1, result.attributes.EDU - 5);
    result.luck = Math.max(character.luck, rollLuck());
  }
  for (let n = 0; n < educationChecks; n++) {
    if (die(100) > result.attributes.EDU) result.attributes.EDU = Math.min(99, result.attributes.EDU + die(10));
  }
  result.updatedAt = new Date().toISOString();
  return result;
}

export function ageGuidance(age: number): string {
  let detail: string;
  try {
    const modifiers = ageModifiers(age);
    detail = age < 20
      ? 'STR 与 SIZ 合计扣 5，EDU 扣 5；幸运掷两次 3D6×5 取高（按钮保留原幸运并补掷一次）。'
      : `${modifiers.educationChecks} 次 EDU 成长检查（D100 大于当前 EDU 时 +1D10，最高 99）。${modifiers.deduction ? `STR、CON、DEX 合计扣 ${modifiers.deduction}；APP 扣 ${modifiers.appearance}。` : ''}`;
  } catch { return '标准建卡年龄为 15–89 岁；其他年龄请与守秘人约定。手动填写的是年龄调整后的最终属性。'; }
  return `手动填写的是年龄调整后的最终属性。${detail}自动年龄调整仅对未调整的初始属性使用一次；身体减值默认优先分配给最高属性，可手动修改。MOV 已按年龄自动计算。`;
}
