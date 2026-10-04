import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RULES } from '../data/rules';
import generalSupplement from '../data/general-supplement.json';
import workbookOccupations from '../data/workbook-occupations.json';
import workbookEquipment from '../data/workbook-equipment.json';
import { blankCharacter } from '../data/samples';
import { availableInEra, occupationChoicesForEra, resolveSkillForEra, sourceCoverage, validateCatalog } from './catalog';
import { characterHTML } from './transfer';
import { getWeapons } from './guidance';

test('verified additions load with traceable sources and valid references', () => {
  assert.doesNotThrow(() => validateCatalog(RULES));
  for (const id of ['archaeologist', 'cat-burglar', 'explorer']) {
    const occupation = RULES.occupations.find(item => item.id === id)!;
    assert.ok(occupation);
    assert.deepEqual(occupation.verificationSourceIds, ['roll20-basic-7e']);
    assert.ok(availableInEra(occupation.eras, 'core'));
    assert.equal(availableInEra(occupation.eras, 'dark-ages'), false);
  }
  const automatic = RULES.equipment.find(item => item.id === 'automatic-32')!;
  assert.equal(automatic.ammo, '8');
  assert.equal(automatic.malfunction, '99');
  assert.equal(automatic.range, '15 码');
  assert.deepEqual(automatic.verificationSourceIds, ['roll20-weapons-7e']);
  const shotgun = RULES.equipment.find(item => item.id === 'shotgun-12-semi-auto')!;
  assert.equal(shotgun.ammo, '5');
  assert.equal(shotgun.range, '10 / 20 / 50 码');
  assert.equal(availableInEra(shotgun.eras, 'japan'), false);
});

test('the public equipment audit covers every physical price row with traceable definitions', () => {
  const rows = generalSupplement.sourceRowCoverage;
  assert.equal(rows.length, 215);
  assert.equal(new Set(rows.map(row => `${row.sourceSection}:${row.sourceItem}`)).size, rows.length);
  for (const row of rows) {
    assert.ok(row.price);
    assert.equal(['Meals Out', 'Speakeasy Prices', 'Lodging', 'Real Estate'].includes(row.sourceSection), false);
    const item = RULES.equipment.find(entry => entry.id === row.definitionId)!;
    assert.ok(item, row.sourceItem);
    assert.ok(item.sourceId === 'roll20-equipment-1920s' || item.verificationSourceIds?.includes('roll20-equipment-1920s'), row.sourceItem);
    assert.equal(item.armor, undefined, row.sourceItem);
  }
});

test('workbook occupations retain eight usable skill slots and explicit reference provenance', () => {
  const source = RULES.sources.find(item => item.id === 'user-workbook-reference')!;
  assert.equal(source.kind, 'user-reference');
  assert.match(source.edition!, /不明/);
  for (const occupation of workbookOccupations.occupations) {
    assert.equal(occupation.sourceId, source.id);
    assert.match(occupation.eraNote, /职业列表!/);
    for (const era of occupation.eras) {
      for (const id of occupation.skills) assert.ok(availableInEra(RULES.skills.find(skill => skill.id === id)!.eras, era), `${occupation.name}:${id}:${era}`);
      for (const group of occupation.choiceGroups ?? []) {
        const options = group.options.filter(id => !occupation.skills.includes(id)
          && availableInEra(RULES.skills.find(skill => skill.id === id)!.eras, era));
        assert.ok(options.length >= group.count, `${occupation.name}:${group.name}:${era}`);
        assert.equal(group.name.includes('workbook-'), false);
      }
    }
  }
  assert.equal(RULES.occupations.some(item => item.id === 'workbook-classical-musician'), false, 'conflicting formula must remain deferred');
});

test('changing eras ignores incompatible saved choices without destroying them', () => {
  const occupation = RULES.occupations.find(item => item.id === 'workbook-lone-criminal')!;
  const choices = ['workbook-fighting-chainsaw', 'art-acting', 'charm', 'locksmith'];
  const original = [...choices];
  assert.deepEqual(occupationChoicesForEra(occupation, choices, RULES, 'japan'), choices);
  assert.deepEqual(occupationChoicesForEra(occupation, choices, RULES, 'core'), ['art-acting', 'charm', 'locksmith']);
  assert.deepEqual(choices, original);
});

test('workbook equipment preserves reference fields and does not overwrite conflicting public values', () => {
  for (const item of workbookEquipment.equipment) {
    assert.equal(item.sourceId, 'user-workbook-reference');
    assert.match(item.description, /出处：/);
    if (item.kind === 'weapon') assert.ok(item.skillId && RULES.skills.some(skill => skill.id === item.skillId), item.name);
  }
  const item = (id: string) => RULES.equipment.find(entry => entry.id === id)!;
  assert.equal(item('workbook-chainsaw').damage, '2D8');
  assert.equal(availableInEra(item('workbook-chainsaw').eras, 'core'), false);
  assert.equal(item('workbook-heavy-leather-jacket').armor, '1');
  assert.match(item('workbook-vehicle-standard-car').description, /不自动改变人物 MOV 或护甲/);
  assert.equal(item('bullwhip').range, '10 英尺');
  assert.equal(item('lewis-mark-i').ammo, '47 / 97');
  assert.equal(item('vickers-303').malfunction, undefined);
});

test('workbook specialist skills complement public weapons without replacing missing source values', () => {
  const bow = RULES.equipment.find(entry => entry.id === 'bow-and-arrows')!;
  assert.equal(bow.skillId, 'workbook-firearms-bow');
  assert.ok(bow.verificationSourceIds?.includes('user-workbook-reference'));
  assert.match(bow.description, /独立专长/);
  const vickers = RULES.equipment.find(entry => entry.id === 'vickers-303')!;
  assert.equal(vickers.malfunction, undefined);
  assert.match(vickers.description, /故障值/);
  const bar = RULES.equipment.find(entry => entry.id === 'bar-m1918')!;
  assert.equal(bar.ammo, '20');
  assert.equal(bar.malfunction, '100');
  assert.equal(bar.range, '90 码');
  const genericShotgun = RULES.equipment.find(entry => entry.id === 'shotgun-12')!;
  assert.equal(genericShotgun.range, '10 / 20 / 50 码');
  assert.equal(genericShotgun.ammo, undefined);
});

test('era selection supports custom skills and preserves other-era inventory and points', () => {
  assert.equal(availableInEra(undefined, 'western'), true);
  assert.equal(availableInEra([], 'japan'), true);
  assert.equal(availableInEra(['custom-era'], 'custom-era'), true);
  assert.equal(availableInEra(['core'], 'custom-era'), true);
  assert.equal(availableInEra(['western'], 'custom-era'), false);
  const character = blankCharacter('dark-ages');
  character.skills['science-astronomy'] = { occupation: 0, personal: 20, growth: 3 };
  character.inventory = [{ id: 'old', definitionId: 'automatic-32', name: '旧武器', quantity: 1,
    notes: '', range: '15 米', damage: '1D8' }];
  const saved = structuredClone(character);
  const html = characterHTML(character, RULES);
  assert.match(html, /旧武器/);
  assert.match(html, /15 米/);
  assert.match(html, /科学（天文学）/);
  assert.deepEqual(character, saved);
});

test('Japanese publications distinguish editions and source coverage from playable data', () => {
  for (const id of ['japan-2020-7e', 'japan-2026-7e']) {
    const source = RULES.sources.find(item => item.id === id)!;
    assert.equal(source.publisher, 'KADOKAWA');
    assert.match(source.edition!, /7th/);
    assert.equal(sourceCoverage(source), '职业：尚未收录 · 技能：尚未收录 · 装备：尚未收录');
  }
  assert.match(RULES.sources.find(item => item.id === 'japan-2015-classic')!.edition!, /6/);
  assert.equal(RULES.rulesets.find(item => item.id === 'japan')!.sourceId, 'japan-2020-7e');
  assert.equal(RULES.rulesets.some(item => item.id === 'pulp-7e'), false);
});

test('reference skills use the selected era base, meaning and linked specialty', () => {
  const skill = (id: string) => RULES.skills.find(entry => entry.id === id)!;
  const profile = (id: string) => RULES.rulesets.find(entry => entry.id === id)!;
  assert.equal(resolveSkillForEra(skill('accounting'), RULES, profile('gaslight')).base, 10);
  const insight = resolveSkillForEra(skill('psychology'), RULES, profile('dark-ages'));
  assert.equal(insight.base, 5);
  assert.match(insight.name, /洞察/);
  assert.match(insight.description, /洞察/);
  const carriage = resolveSkillForEra(skill('drive-auto'), RULES, profile('gaslight'));
  assert.equal(carriage.name, skill('drive-carriage').name);
  assert.equal(carriage.base, 20);
  assert.equal(resolveSkillForEra(skill('accounting'), RULES).base, 5);
});

test('catalog validation rejects dangling references, cycles and invalid career slots', () => {
  const missingSource = structuredClone(RULES);
  missingSource.equipment[0].verificationSourceIds = ['missing-source'];
  assert.throws(() => validateCatalog(missingSource), /missing-source/);
  const badEra = structuredClone(RULES);
  badEra.equipment[0].eras = ['missing-era'];
  assert.throws(() => validateCatalog(badEra), /missing-era/);
  const cycle = structuredClone(RULES);
  cycle.skills[0].parentId = cycle.skills[0].id;
  assert.throws(() => validateCatalog(cycle), /循环/);
  const badOccupation = structuredClone(RULES);
  badOccupation.occupations[0].choiceCount = 99;
  assert.throws(() => validateCatalog(badOccupation), /槽位/);
});

test('unarmed records with new manually entered values remain visible', () => {
  const unarmed = RULES.equipment.find(item => item.id === 'unarmed')!;
  const character = blankCharacter();
  character.inventory = [{ id: 'manual', definitionId: 'unarmed', name: unarmed.name, quantity: 1,
    notes: '', damage: unarmed.damage, range: unarmed.range, attacks: unarmed.attacks, armor: '2' }];
  assert.equal(getWeapons(character, RULES).length, 2);
  assert.equal(getWeapons(character, RULES)[1].armor, '2');
});
