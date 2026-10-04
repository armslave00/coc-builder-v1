import type { RuleData } from '../types';
import { availableInEra } from './eras';

export const WORKBOOK_EXTENSION_ID = 'workbook-reference';
const WORKBOOK_SOURCE_ID = 'user-workbook-reference';

export const EXTENSIONS = [{
  id: WORKBOOK_EXTENSION_ID,
  name: 'Excel 参考扩展包',
  description: '165 个职业、46 项技能与专长、206 件装备。按资料标注的时代开放，数值与适用条件需与守秘人确认。',
}] as const;

export function availableWithExtensions(item: { sourceId?: string }, enabledIds: readonly string[] = []): boolean {
  return item.sourceId !== WORKBOOK_SOURCE_ID || enabledIds.includes(WORKBOOK_EXTENSION_ID);
}

/** Keep saved definitions; public weapons cannot select a disabled or era-incompatible Excel skill. */
export function rulesForExtensions(rules: RuleData, enabledIds: readonly string[] = [], eraId?: string): RuleData {
  const unavailableSkillIds = new Set(rules.skills.filter(skill => !availableWithExtensions(skill, enabledIds)
    || skill.sourceId === WORKBOOK_SOURCE_ID && eraId !== undefined && !availableInEra(skill.eras, eraId)).map(skill => skill.id));
  if (!unavailableSkillIds.size) return rules;
  return {
    ...rules,
    equipment: rules.equipment.map(item => {
      if (!availableWithExtensions(item, enabledIds) || !item.skillId || !unavailableSkillIds.has(item.skillId)) return item;
      const { skillId: _skillId, ...definition } = item;
      return definition;
    }),
  };
}
