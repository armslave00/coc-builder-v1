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

function mergeDefinitions<T extends { id: string; name?: string; title?: string }>(existing: T[], incoming: T[], builtins: T[], label: string, legacyOptionalFields: string[] = []): T[] {
  const known = new Map(builtins.map(item => [item.id, item]));
  const builtinIds = new Set(known.keys());
  const merged: T[] = [];
  for (const item of [...existing, ...incoming]) {
    const previous = known.get(item.id);
    if (previous) {
      // Older duplicates may omit newly introduced metadata. They are discarded,
      // never used to replace a builtin; all supplied fields still must match.
      const comparison = { ...item } as Record<string, unknown>;
      if (builtinIds.has(item.id)) {
        const builtin = previous as Record<string, unknown>;
        for (const field of legacyOptionalFields) {
          if (comparison[field] === undefined) comparison[field] = builtin[field];
        }
      }
      if (definitionJSON(previous) !== definitionJSON(comparison)) {
        throw new Error(`${label}「${item.name ?? item.title ?? item.id}」的标识 ${item.id} 与已有定义冲突，请使用不同标识或相同定义。`);
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
    rulesets: mergeDefinitions(existing.rulesets, incoming.rulesets, builtins.rulesets, '原创规则', ['skillDescriptions', 'notes']),
    skills: mergeDefinitions(existing.skills, incoming.skills, builtins.skills, '原创技能', ['description', 'scenarios', 'sourceId', 'eras', 'parentId', 'specialization', 'note']),
    occupations: mergeDefinitions(existing.occupations, incoming.occupations, builtins.occupations, '原创职业', ['version', 'eraNote', 'verificationSourceIds', 'eras']),
    equipment: mergeDefinitions(existing.equipment, incoming.equipment, builtins.equipment, '原创装备', ['kind', 'skillId', 'eras', 'ammo', 'malfunction', 'armor', 'verificationSourceIds']),
    spells: mergeDefinitions(existing.spells, incoming.spells, builtins.spells, '原创法术'),
    ...(existing.sources === undefined && incoming.sources === undefined ? {} : {
      sources: mergeDefinitions(existing.sources ?? [], incoming.sources ?? [], builtins.sources, '原创来源', ['publisher', 'year', 'edition', 'kind', 'coverage']),
    }),
  };
  const skillIds = new Set([...builtins.skills, ...merged.skills].map(skill => skill.id));
  const sourceIds = new Set([...builtins.sources, ...(merged.sources ?? [])].map(source => source.id));
  const legacySourceIds = new Set([...(existing.legacySourceIds ?? []), ...(incoming.legacySourceIds ?? [])]);
  for (const content of [existing, incoming]) {
    if (content.sources !== undefined) continue;
    for (const key of ['rulesets', 'occupations', 'equipment', 'spells'] as const) {
      for (const item of content[key]) legacySourceIds.add(item.sourceId);
    }
  }
  for (const id of legacySourceIds) {
    if (id === 'original' || sourceIds.has(id)) legacySourceIds.delete(id);
  }
  if (legacySourceIds.size > 500) throw new Error('旧资料来源标识不得超过 500 项。');
  if (legacySourceIds.size || existing.legacySourceIds !== undefined || incoming.legacySourceIds !== undefined) merged.legacySourceIds = [...legacySourceIds];
  const requireSource = (sourceId: string, context: string, legacy = false): void => {
    // Legacy labels travel with exported archives; they do not authenticate new
    // skill provenance or verification references. The workshop sentinel is stable.
    if (sourceId !== 'original' && !(legacy && legacySourceIds.has(sourceId))) requireReference(sourceIds, sourceId, '来源', context);
  };
  const skills = new Map([...builtins.skills, ...merged.skills].map(skill => [skill.id, skill]));
  for (const skill of merged.skills) {
    const context = `原创技能「${skill.name}」`;
    if (skill.sourceId !== undefined) requireSource(skill.sourceId, context);
    if (skill.parentId !== undefined) {
      requireReference(skillIds, skill.parentId, '父技能', context);
      const ancestors = new Set([skill.id]);
      let parentId: string | undefined = skill.parentId;
      while (parentId !== undefined) {
        if (ancestors.has(parentId)) throw new Error(`${context}的父技能关系存在循环：${parentId}。`);
        ancestors.add(parentId);
        parentId = skills.get(parentId)?.parentId;
      }
    }
  }
  for (const occupation of merged.occupations) {
    const context = `原创职业「${occupation.name}」`;
    requireSource(occupation.sourceId, context, true);
    for (const id of occupation.verificationSourceIds ?? []) requireSource(id, `${context}的校核来源`);
    for (const id of occupation.skills) requireReference(skillIds, id, '技能', context);
    for (const group of occupation.choiceGroups ?? []) {
      for (const id of group.options) requireReference(skillIds, id, '技能', `${context}的可选组「${group.name}」`);
    }
  }
  for (const ruleset of merged.rulesets) {
    const context = `原创规则「${ruleset.name}」`;
    requireSource(ruleset.sourceId, context, true);
    for (const id of Object.keys(ruleset.skillBaseOverrides ?? {})) requireReference(skillIds, id, '技能', `${context}的基础值覆盖`);
    // Alias keys reference skills; their values are unrestricted display labels.
    for (const id of Object.keys(ruleset.skillAliases ?? {})) requireReference(skillIds, id, '技能', `${context}的技能别名`);
    for (const id of Object.keys(ruleset.skillDescriptions ?? {})) requireReference(skillIds, id, '技能', `${context}的技能说明`);
  }
  for (const equipment of merged.equipment) {
    requireSource(equipment.sourceId, `原创装备「${equipment.name}」`, true);
    for (const id of equipment.verificationSourceIds ?? []) requireSource(id, `原创装备「${equipment.name}」的校核来源`);
    if (equipment.skillId !== undefined) requireReference(skillIds, equipment.skillId, '技能', `原创装备「${equipment.name}」`);
  }
  for (const spell of merged.spells) requireSource(spell.sourceId, `原创法术「${spell.name}」`, true);
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
    for (const item of character.inventory) {
      if (item.skillId !== undefined) requireReference(skillIds, item.skillId, '技能', `${context}的装备「${item.name}」`);
    }
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
