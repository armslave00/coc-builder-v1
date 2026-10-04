import type { Occupation, RuleData, RuleSource, Ruleset, SkillDefinition } from '../types';

export const COVERAGE_LABELS = {
  complete: '完整收录',
  partial: '部分收录',
  'not-included': '尚未收录',
  'not-applicable': '不涉及',
} as const;

export function availableInEra(eras: string[] | undefined, eraId: string): boolean {
  return !eras?.length || eras.includes(eraId) || (eraId.startsWith('custom-') && eras.includes('core'));
}

/** Ignore unavailable saved choices for eligibility, without deleting archived data. */
export function occupationChoicesForEra(occupation: Occupation | undefined, choices: string[], rules: RuleData, eraId: string): string[] {
  if (!occupation) return [];
  const grouped = new Set(occupation.choiceGroups?.flatMap(group => group.options));
  return choices.filter(id => {
    const skill = rules.skills.find(entry => entry.id === id);
    return skill && availableInEra(skill.eras, eraId) && id !== 'cthulhu-mythos' && id !== 'credit-rating'
      && !occupation.skills.includes(id) && (grouped.has(id) || !!occupation.choiceCount);
  });
}

export function resolveSkillForEra(skill: SkillDefinition, rules: RuleData, profile?: Ruleset): SkillDefinition {
  if (!profile) return skill;
  const alias = profile.skillAliases?.[skill.id];
  const mapped = alias ? rules.skills.find(entry => entry.id === alias) : undefined;
  const definition = mapped ?? skill;
  const help = profile.skillDescriptions?.[skill.id];
  return {
    ...definition, id: skill.id,
    name: mapped?.name ?? alias ?? skill.name,
    english: mapped?.english ?? (alias ? '' : skill.english),
    base: profile.skillBaseOverrides?.[definition.id] ?? profile.skillBaseOverrides?.[skill.id] ?? definition.base,
    ...(help ? { description: help.description, scenarios: help.scenarios } : {}),
  };
}

export function sourceCoverage(source: RuleSource): string {
  if (!source.coverage) return '参见来源说明';
  return (['occupations', 'skills', 'equipment'] as const).map((key, index) =>
    `${['职业', '技能', '装备'][index]}：${COVERAGE_LABELS[source.coverage![key]]}`
  ).join(' · ');
}

/** A publication reference is distinct from a verified, playable catalog entry. */
export function validateCatalog(rules: RuleData): void {
  const sourceIds = new Set(rules.sources.map(source => source.id));
  const profileIds = new Set(rules.rulesets.map(profile => profile.id));
  const skills = new Map(rules.skills.map(skill => [skill.id, skill]));
  const requireId = (ids: ReadonlySet<string>, id: string, context: string) => {
    if (!ids.has(id)) throw new Error(`${context} 引用不存在的标识 ${id}。`);
  };
  for (const entries of [rules.sources, rules.rulesets, rules.skills, rules.occupations, rules.equipment, rules.spells]) {
    const ids = entries.map(entry => entry.id);
    if (new Set(ids).size !== ids.length) throw new Error('资料目录存在重复标识。');
  }
  for (const item of [...rules.rulesets, ...rules.skills, ...rules.occupations, ...rules.equipment, ...rules.spells]) {
    if (item.sourceId) requireId(sourceIds, item.sourceId, item.id);
    if ('eras' in item) for (const era of item.eras ?? []) requireId(profileIds, era, item.id);
  }
  const skillIds = new Set(skills.keys());
  for (const skill of rules.skills) {
    if (skill.parentId) {
      requireId(skillIds, skill.parentId, skill.id);
      const visited = new Set([skill.id]);
      let parent = skill.parentId;
      while (parent) {
        if (visited.has(parent)) throw new Error(`技能专长关系存在循环：${skill.id}。`);
        visited.add(parent);
        parent = skills.get(parent)?.parentId ?? '';
      }
    }
  }
  for (const occupation of rules.occupations) {
    for (const id of [...occupation.skills, ...(occupation.choiceGroups ?? []).flatMap(group => group.options)]) {
      requireId(skillIds, id, occupation.id);
      if (id === 'cthulhu-mythos') throw new Error(`${occupation.id} 不可用建卡点购买克苏鲁神话。`);
    }
    const slots = occupation.skills.length + (occupation.choiceCount ?? 0)
      + (occupation.choiceGroups ?? []).reduce((sum, group) => sum + group.count, 0);
    if (slots !== 8) throw new Error(`${occupation.id} 的职业技能槽位应为 8。`);
    for (const group of occupation.choiceGroups ?? []) {
      if (group.count < 1 || group.count > new Set(group.options).size || new Set(group.options).size !== group.options.length) {
        throw new Error(`${occupation.id} 的职业可选组无效。`);
      }
    }
    for (const id of occupation.verificationSourceIds ?? []) requireId(sourceIds, id, occupation.id);
    if (occupation.credit[0] < 0 || occupation.credit[1] > 99 || occupation.credit[0] > occupation.credit[1]) {
      throw new Error(`${occupation.id} 的信用范围无效。`);
    }
  }
  for (const item of rules.equipment) {
    if (item.skillId) requireId(skillIds, item.skillId, item.id);
    for (const id of item.verificationSourceIds ?? []) requireId(sourceIds, id, item.id);
  }
  for (const profile of rules.rulesets) {
    for (const id of [...Object.keys(profile.skillBaseOverrides ?? {}), ...Object.keys(profile.skillAliases ?? {}), ...Object.keys(profile.skillDescriptions ?? {})]) {
      requireId(skillIds, id, profile.id);
    }
  }
}
