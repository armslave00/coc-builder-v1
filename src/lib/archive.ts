import type { Character, CustomContent, RuleData } from '../types';
import { getSkillTotal } from './rules';

/** JSON definitions compare independently of object-key order and optional undefined fields. */
function definitionJSON(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) return item;
    const object = item as Record<string, unknown>;
    return Object.fromEntries(Object.keys(object).sort().map(key => [key, object[key]]));
  });
}

function mergeDefinitions<T extends { id: string; name: string }>(existing: T[], incoming: T[], builtins: T[], label: string): T[] {
  const known = new Map(builtins.map(item => [item.id, item]));
  const merged: T[] = [];
  for (const item of [...existing, ...incoming]) {
    const previous = known.get(item.id);
    if (previous) {
      if (definitionJSON(previous) !== definitionJSON(item)) {
        throw new Error(`${label}「${item.name}」的标识 ${item.id} 与已有定义冲突，请使用不同标识或相同定义。`);
      }
      continue;
    }
    const copy = structuredClone(item);
    known.set(copy.id, copy);
    merged.push(copy);
  }
  return merged;
}

function requireReference(ids: ReadonlySet<string>, id: string, kind: string, context: string): void {
  if (!ids.has(id)) throw new Error(`${context}引用的${kind} ${id} 未找到，请一并导入对应定义。`);
}

/** Merge complete definitions first so references may point to another item in the incoming file. */
export function mergeCustom(existing: CustomContent, incoming: CustomContent, builtins: RuleData): CustomContent {
  const merged: CustomContent = {
    rulesets: mergeDefinitions(existing.rulesets, incoming.rulesets, builtins.rulesets, '原创规则'),
    skills: mergeDefinitions(existing.skills, incoming.skills, builtins.skills, '原创技能'),
    occupations: mergeDefinitions(existing.occupations, incoming.occupations, builtins.occupations, '原创职业'),
    equipment: mergeDefinitions(existing.equipment, incoming.equipment, builtins.equipment, '原创装备'),
    spells: mergeDefinitions(existing.spells, incoming.spells, builtins.spells, '原创法术'),
  };
  const skillIds = new Set([...builtins.skills, ...merged.skills].map(skill => skill.id));
  for (const occupation of merged.occupations) {
    const context = `原创职业「${occupation.name}」`;
    for (const id of occupation.skills) requireReference(skillIds, id, '技能', context);
    for (const group of occupation.choiceGroups ?? []) {
      for (const id of group.options) requireReference(skillIds, id, '技能', `${context}的可选组「${group.name}」`);
    }
  }
  for (const ruleset of merged.rulesets) {
    const context = `原创规则「${ruleset.name}」`;
    for (const id of Object.keys(ruleset.skillBaseOverrides ?? {})) requireReference(skillIds, id, '技能', `${context}的基础值覆盖`);
    // Alias keys reference skills; their values are unrestricted display labels.
    for (const id of Object.keys(ruleset.skillAliases ?? {})) requireReference(skillIds, id, '技能', `${context}的技能别名`);
  }
  return merged;
}

/** Run only for new imports; legacy local archives may intentionally retain unavailable definitions. */
export function validateCharacterReferences(characters: Character[], rules: RuleData): void {
  const rulesets = new Map(rules.rulesets.map(item => [item.id, item]));
  const occupationIds = new Set(rules.occupations.map(item => item.id));
  const skills = new Map(rules.skills.map(item => [item.id, item]));
  const skillIds = new Set(skills.keys());
  const spellIds = new Set(rules.spells.map(item => item.id));
  for (const character of characters) {
    const context = `调查员「${character.name}」`;
    requireReference(new Set(rulesets.keys()), character.rulesetId, '规则', context);
    requireReference(occupationIds, character.occupationId, '职业', context);
    for (const id of character.occupationChoices) requireReference(skillIds, id, '技能', `${context}的职业可选项`);
    for (const id of character.spellIds) requireReference(spellIds, id, '法术', context);
    const ruleset = rulesets.get(character.rulesetId)!;
    for (const [id, allocation] of Object.entries(character.skills)) {
      requireReference(skillIds, id, '技能', context);
      if (id === 'cthulhu-mythos' && (allocation.occupation !== 0 || allocation.personal !== 0)) {
        throw new Error(`${context}的克苏鲁神话技能不能分配职业点或兴趣点，请仅使用成长点。`);
      }
      const skill = skills.get(id)!;
      const total = getSkillTotal(skill, character, ruleset);
      if (total > 99) throw new Error(`${context}的技能「${skill.name}」总值 ${total} 超过 99，请减少加点。`);
    }
  }
}
