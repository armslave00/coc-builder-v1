import type { Character, RuleData, SkillDefinition } from '../types';
import { availableInEra, occupationChoicesForEra } from './catalog';
import { weaponSkillId } from './guidance';

/** Select printable skills without changing saved allocations or choices. */
export function selectCardSkills(character: Character, rules: RuleData): SkillDefinition[] {
  const profile = rules.rulesets.find(item => item.id === character.rulesetId);
  const skillIds = new Set(rules.skills.map(skill => skill.id));
  const mappedId = (id: string): string => {
    const alias = profile?.skillAliases?.[id];
    return alias && skillIds.has(alias) ? alias : id;
  };
  const sourceOccupation = rules.occupations.find(item => item.id === character.occupationId);
  const occupation = sourceOccupation ? {
    ...sourceOccupation,
    skills: sourceOccupation.skills.map(mappedId),
    choiceGroups: sourceOccupation.choiceGroups?.map(group => ({ ...group, options: group.options.map(mappedId) })),
  } : undefined;
  const careerIds = new Set([
    ...(occupation?.skills ?? []),
    ...occupationChoicesForEra(occupation, character.occupationChoices.map(mappedId), rules, character.rulesetId),
  ]);
  const recordedIds = new Set(Object.entries(character.skills)
    .filter(([, allocation]) => allocation.occupation > 0 || allocation.personal > 0 || allocation.growth > 0)
    .map(([id]) => id));
  for (const item of character.inventory) {
    const id = weaponSkillId(item, rules);
    if (id) recordedIds.add(id);
  }

  // Legacy child definitions already identify a specialty through parentId.
  return rules.skills.filter(skill => recordedIds.has(skill.id)
    || (availableInEra(skill.eras, character.rulesetId)
      && (!(skill.specialization || skill.parentId) || careerIds.has(skill.id))));
}
