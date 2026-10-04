import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assembleRulePacks, RULES } from '../data/rules';
import { blankCharacter } from '../data/samples';
import { ATTRIBUTE_KEYS } from '../types';
import type { InventoryItem } from '../types';
import { getAttributeDescription, getBuildDescription, getItems, getSkillHelp, getWeapons, getWealthGuidance, inventoryKind, weaponSkillId } from './guidance';

const profile = (id: string) => RULES.rulesets.find(item => item.id === id)!;
const skill = (id: string) => RULES.skills.find(item => item.id === id)!;
const inventoryItem = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
  id: 'record', definitionId: 'missing-old-definition', name: '旧物品', quantity: 1, notes: '', ...overrides,
});

test('workbook-adapted characteristic guidance covers each allowed value exactly once', () => {
  for (const key of ATTRIBUTE_KEYS) {
    const bands = RULES.guidance!.attributes[key].bands;
    for (let value = 1; value <= 99; value++) {
      assert.equal(bands.filter(band => value >= band.min && value <= band.max).length, 1, `${key}:${value}`);
      assert.ok(getAttributeDescription(key, value, RULES));
    }
    for (const band of bands) assert.equal(getAttributeDescription(key, band.min, RULES), getAttributeDescription(key, band.max, RULES));
    assert.equal(getAttributeDescription(key, 0, RULES), '');
    assert.equal(getAttributeDescription(key, 100, RULES), '');
  }
  assert.equal(new Set([-2, -1, 0, 1, 2].map(value => getBuildDescription(value, RULES))).size, 5);
  assert.equal(getBuildDescription(3, RULES), '');
});

test('attribute reference anchors preserve the workbook distinctions without changing mechanics', () => {
  assert.match(getAttributeDescription('STR', 50, RULES), /普通人/);
  assert.match(getAttributeDescription('STR', 99, RULES), /世界级举重/);
  assert.match(getAttributeDescription('SIZ', 65, RULES), /中等身高/);
  assert.match(getAttributeDescription('SIZ', 80, RULES), /高大/);
  assert.match(getAttributeDescription('EDU', 60, RULES), /高中/);
  assert.match(getAttributeDescription('EDU', 70, RULES), /大学/);
  assert.match(getAttributeDescription('EDU', 80, RULES), /研究生/);
  assert.match(getAttributeDescription('EDU', 90, RULES), /博士/);
  assert.match(getAttributeDescription('EDU', 96, RULES), /世界级权威/);
  assert.match(getBuildDescription(0, RULES), /比较双方体格/);
});

test('wealth guidance respects every tier boundary and does not turn historical status into cash', () => {
  const tiers = [[0, 0, '身无分文'], [1, 9, '贫困'], [10, 49, '一般'], [50, 89, '富裕'], [90, 98, '富豪'], [99, 99, '巨富']] as const;
  for (const [min, max, label] of tiers) {
    assert.equal(getWealthGuidance(min, RULES, profile('core')).label, label);
    assert.equal(getWealthGuidance(max, RULES, profile('core')).label, label);
  }
  assert.equal(getWealthGuidance(100, RULES).label, '待确认');
  assert.equal(getWealthGuidance(0, RULES, profile('dark-ages')).label, '社会地位');
  assert.deepEqual(getWealthGuidance(0, RULES, profile('dark-ages')), getWealthGuidance(99, RULES, profile('dark-ages')));
  for (const id of ['gaslight', 'western']) assert.match(getWealthGuidance(50, RULES, profile(id)).description, /历史设定下的原创定性辅助/);
});

test('era help follows changed meanings and all bundled skills have usable original help', () => {
  for (const definition of RULES.skills) {
    const help = getSkillHelp(definition);
    assert.ok(help.description.length > 10, definition.id);
    assert.ok(help.scenarios.length >= 2, definition.id);
  }
  assert.match(getSkillHelp(skill('psychology'), profile('dark-ages')).description, /洞察/);
  assert.match(getSkillHelp(skill('credit-rating'), profile('dark-ages')).description, /社会地位/);
  assert.match(getSkillHelp(skill('language-own'), profile('dark-ages')).description, /口语/);
  assert.match(getSkillHelp(skill('mechanical-repair'), profile('dark-ages')).description, /维修与制作/);
  assert.match(getSkillHelp(skill('drive-auto'), profile('gaslight')).description, /马车/);
  assert.deepEqual(getSkillHelp(skill('psychoanalysis'), profile('gaslight')), getSkillHelp(skill('alienism')));
  assert.match(getSkillHelp(skill('drive-carriage'), profile('western')).description, /篷车/);
  assert.deepEqual(getSkillHelp(skill('spot-hidden'), profile('dark-ages')), getSkillHelp(skill('spot-hidden')));
});

test('split catalogs retain counts, unique IDs and all rule references after merging duplicate profiles', () => {
  assert.deepEqual(RULES.rulesets.map(item => item.id), ['core', 'gaslight', 'japan', 'dark-ages', 'western']);
  assert.equal(RULES.skills.length, 120);
  assert.equal(RULES.occupations.length, 191);
  assert.equal(RULES.equipment.length, 481);
  assert.equal(RULES.spells.length, 8);
  for (const catalog of [RULES.sources, RULES.rulesets, RULES.skills, RULES.occupations, RULES.equipment, RULES.spells]) {
    assert.equal(new Set(catalog.map(item => item.id)).size, catalog.length);
  }
  const sourceIds = new Set(RULES.sources.map(item => item.id));
  const skillIds = new Set(RULES.skills.map(item => item.id));
  for (const occupation of RULES.occupations) {
    assert.ok(sourceIds.has(occupation.sourceId));
    for (const id of [...occupation.skills, ...(occupation.choiceGroups ?? []).flatMap(group => group.options)]) assert.ok(skillIds.has(id), id);
  }
  const profileIds = new Set(RULES.rulesets.map(item => item.id));
  for (const catalog of [RULES.skills, RULES.occupations, RULES.equipment, RULES.spells]) {
    for (const item of catalog as { id: string; sourceId?: string; eras?: string[] }[]) {
      if (item.sourceId) assert.ok(sourceIds.has(item.sourceId), `${item.id}: source`);
      for (const id of item.eras ?? []) assert.ok(profileIds.has(id), `${item.id}: era ${id}`);
    }
  }
  for (const item of RULES.equipment) {
    assert.ok(sourceIds.has(item.sourceId));
    if (item.skillId) assert.ok(skillIds.has(item.skillId));
  }
  for (const ruleset of RULES.rulesets) {
    assert.ok(sourceIds.has(ruleset.sourceId));
    for (const id of [...Object.keys(ruleset.skillAliases ?? {}), ...Object.keys(ruleset.skillBaseOverrides ?? {}), ...Object.keys(ruleset.skillDescriptions ?? {})]) assert.ok(skillIds.has(id), id);
  }
  assert.match(profile('gaslight').description, /维多利亚时代/);
  assert.equal(RULES.rulesets.some(item => item.id === 'victorian'), false);
  assert.equal(profile('dark-ages').skillBaseOverrides?.psychology, 5);
  assert.equal(profile('western').skillBaseOverrides?.ride, 15);
});

test('inventory classification prefers saved type, then definition, then legacy damage', () => {
  assert.equal(inventoryKind(inventoryItem({ definitionId: 'small-knife', kind: 'item', damage: '1D4' }), RULES), 'item');
  assert.equal(inventoryKind(inventoryItem({ definitionId: 'notebook', damage: '1D4' }), RULES), 'item');
  assert.equal(inventoryKind(inventoryItem({ definitionId: 'small-knife' }), RULES), 'weapon');
  assert.equal(inventoryKind(inventoryItem({ damage: '1D6' }), RULES), 'weapon');
  assert.equal(inventoryKind(inventoryItem(), RULES), 'item');
  assert.equal(weaponSkillId(inventoryItem({ definitionId: 'small-knife' }), RULES), 'fighting-brawl');
  assert.equal(weaponSkillId(inventoryItem({ definitionId: 'small-knife', skillId: 'custom-skill' }), RULES), 'custom-skill');
  assert.equal(weaponSkillId(inventoryItem(), RULES), undefined);
});

test('innate unarmed deduplicates standard records and preserves edited records and unknown equipment', () => {
  const character = blankCharacter();
  const definition = RULES.equipment.find(item => item.id === 'unarmed')!;
  const standard = inventoryItem({ definitionId: 'unarmed', name: definition.name, damage: definition.damage, range: definition.range, attacks: definition.attacks });
  character.inventory = [standard, { ...standard, id: 'duplicate' }, { ...standard, id: 'custom-unarmed', damage: '2D3', notes: '守秘人批准' }, inventoryItem({ id: 'legacy-weapon', damage: '1D8' }), inventoryItem({ id: 'legacy-item' })];
  const saved = structuredClone(character.inventory);
  const weapons = getWeapons(character, RULES);
  assert.equal(weapons.length, 3);
  assert.equal(weapons[0].id, 'innate-unarmed');
  assert.equal(weapons[1].damage, '2D3');
  assert.match(weapons[1].name, /手动记录/);
  assert.equal(weapons[2].id, 'legacy-weapon');
  assert.deepEqual(getItems(character, RULES).map(item => item.id), ['legacy-item']);
  assert.deepEqual(character.inventory, saved);
  character.inventory = [];
  assert.equal(getWeapons(character, RULES).length, 1);
  assert.equal(getItems(character, RULES).length, 0);
});


test('increment packs can add every catalog and merge identical definitions while rejecting conflicts', () => {
  const source = { id: 'addon-source', title: '增量资料', url: '', note: '' };
  const definition = { ...skill('spot-hidden'), id: 'addon-skill' };
  const occupation = { ...RULES.occupations[0], id: 'addon-occupation', sourceId: source.id, skills: [definition.id] };
  const equipment = { ...RULES.equipment[0], id: 'addon-item', sourceId: source.id };
  const spell = { ...RULES.spells[0], id: 'addon-spell', sourceId: source.id };
  const ruleset = { ...profile('core'), id: 'addon-profile', sourceId: source.id };
  const assembled = assembleRulePacks([RULES, {
    sources: [source], skills: [definition], occupations: [occupation], equipment: [equipment], spells: [spell], rulesets: [ruleset],
  }, { sources: [{ note: '', url: '', title: '增量资料', id: source.id }], skills: [definition] }]);
  for (const [catalog, id] of [
    ['sources', source.id], ['skills', definition.id], ['occupations', occupation.id], ['equipment', equipment.id], ['spells', spell.id], ['rulesets', ruleset.id],
  ] as const) assert.equal(assembled[catalog].filter(item => item.id === id).length, 1);
  assert.throws(() => assembleRulePacks([RULES, { skills: [{ ...skill('spot-hidden'), base: 99 }] }]), /spot-hidden.*冲突/);
  assert.throws(() => assembleRulePacks([RULES, { sources: [{ ...RULES.sources[0], title: '不同资料' }] }]), /sources.*冲突/);
});

test('profile inheritance merges additions and catches missing parents and cycles', () => {
  const parent = { ...profile('core'), id: 'parent', skillBaseOverrides: { 'spot-hidden': 10, listen: 20 } };
  const child = { ...profile('core'), id: 'child', skillBaseOverrides: { listen: 30 } };
  const assembled = assembleRulePacks([{ version: 'test', rulesets: [parent] }, { extends: 'parent', rulesets: [child] }]);
  assert.deepEqual(assembled.rulesets[1].skillBaseOverrides, { 'spot-hidden': 10, listen: 30 });
  assert.throws(() => assembleRulePacks([{ version: 'test' }, { extends: 'missing', rulesets: [child] }]), /missing.*不存在/);
  assert.throws(() => assembleRulePacks([{ version: 'test', extends: 'child', rulesets: [parent] }, { extends: 'parent', rulesets: [child] }]), /继承循环/);
});

test('innate attack IDs cannot collide with any imported inventory record', () => {
  const character = blankCharacter();
  character.inventory = [inventoryItem({ id: 'innate-unarmed', damage: '1D4' }), inventoryItem({ id: 'innate-unarmed-1' })];
  const weapons = getWeapons(character, RULES);
  assert.equal(weapons[0].id, 'innate-unarmed-2');
  assert.ok(!character.inventory.some(item => item.id === weapons[0].id));
  assert.equal(new Set(weapons.map(item => item.id)).size, weapons.length);
  assert.equal(weapons[1].id, 'innate-unarmed');
  assert.equal(getItems(character, RULES)[0].id, 'innate-unarmed-1');
});
