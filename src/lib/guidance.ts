import type { AttributeKey, Character, InventoryItem, RuleData, Ruleset, SkillDefinition, SkillHelp } from '../types';

export function getAttributeDescription(key: AttributeKey, value: number, rules: RuleData): string {
  const attribute = rules.guidance?.attributes[key];
  return attribute?.bands.find(band => value >= band.min && value <= band.max)?.description ?? '';
}

export function getBuildDescription(value: number, rules: RuleData): string {
  return rules.guidance?.build.find(band => band.value === value)?.description ?? '';
}

export function getSkillHelp(skill: SkillDefinition, ruleset?: Ruleset): SkillHelp {
  return ruleset?.skillDescriptions?.[skill.id] ?? {
    description: skill.description ?? '此技能尚未填写简介，可参考对应规则资料或补充原创说明。',
    scenarios: skill.scenarios ?? [],
  };
}

export function getWealthGuidance(value: number, rules: RuleData, ruleset?: Ruleset): { label: string; description: string } {
  if (ruleset?.id === 'dark-ages') {
    return {
      label: '社会地位',
      description: '此值反映黑暗时代的社会位置与待遇；当前为核心职业范围的时代适配参考，不直接换算现金、资产或现代生活水平。',
    };
  }
  const band = rules.guidance?.wealth.find(item => value >= item.min && value <= item.max);
  if (!band) return { label: '待确认', description: '此值暂无生活水平参考，请结合所用规则与人物背景记录财产。' };
  const historical = ['gaslight', 'victorian', 'western'].includes(ruleset?.id ?? '');
  return {
    label: band.label,
    description: `${band.description}${historical ? '这是该历史设定下的原创定性辅助；金额、币种和财产条件须按当地时代资料确认。' : '这是原创定性辅助；现金与资产金额须按所用时代和规则资料确认。'}`,
  };
}

export function inventoryKind(item: InventoryItem, rules: RuleData): 'weapon' | 'item' {
  return item.kind ?? rules.equipment.find(definition => definition.id === item.definitionId)?.kind ?? (item.damage ? 'weapon' : 'item');
}

export function weaponSkillId(item: InventoryItem, rules: RuleData): string | undefined {
  return item.skillId ?? rules.equipment.find(definition => definition.id === item.definitionId)?.skillId;
}

function standardUnarmed(item: InventoryItem, definition: RuleData['equipment'][number]): boolean {
  return item.definitionId === definition.id && item.name === definition.name && item.quantity === 1 && item.notes === ''
    && item.damage === definition.damage && item.range === definition.range && item.attacks === definition.attacks
    && (item.kind === undefined || item.kind === 'weapon') && (item.skillId === undefined || item.skillId === definition.skillId)
    && (['ammo', 'malfunction', 'armor'] as const).every(key => item[key] === undefined || item[key] === definition[key]);
}

export function getWeapons(character: Character, rules: RuleData): InventoryItem[] {
  const unarmed = rules.equipment.find(item => item.id === 'unarmed');
  const inventory = character.inventory.filter(item => inventoryKind(item, rules) === 'weapon');
  if (!unarmed) return inventory;
  const savedIds = new Set(character.inventory.map(item => item.id));
  let innateId = 'innate-unarmed';
  for (let suffix = 1; savedIds.has(innateId); suffix++) innateId = `innate-unarmed-${suffix}`;
  const innate: InventoryItem = {
    id: innateId, definitionId: 'unarmed', name: unarmed.name, quantity: 1,
    notes: '固有攻击 · 伤害加值随属性计算', kind: 'weapon', skillId: unarmed.skillId,
    damage: unarmed.damage, range: unarmed.range, attacks: unarmed.attacks,
  };
  // Display the innate attack once. Edited records retain all saved data in a separate row.
  const recorded = inventory.filter(item => !standardUnarmed(item, unarmed)).map(item => item.definitionId === 'unarmed'
    ? { ...item, name: `${item.name}（手动记录）` } : item);
  return [innate, ...recorded];
}

export function getItems(character: Character, rules: RuleData): InventoryItem[] {
  return character.inventory.filter(item => inventoryKind(item, rules) === 'item');
}
