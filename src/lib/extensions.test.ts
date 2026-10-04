import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RULES } from '../data/rules';
import { blankCharacter } from '../data/samples';
import { availableInContext } from './catalog';
import { skillsForCharacter, selectCardSkills } from './card-skills';
import { availableWithExtensions, rulesForExtensions, WORKBOOK_EXTENSION_ID } from './extensions';

test('Excel catalogs require an explicitly enabled extension in every era', () => {
  for (const catalog of [RULES.skills, RULES.occupations, RULES.equipment]) {
    const additions = catalog.filter(item => item.sourceId === 'user-workbook-reference');
    assert.ok(additions.length);
    for (const item of additions) {
      assert.equal(availableWithExtensions(item), false, item.id);
      for (const profile of RULES.rulesets) assert.equal(availableInContext(item, profile.id), false, `${item.id}:${profile.id}`);
      assert.equal(availableWithExtensions(item, [WORKBOOK_EXTENSION_ID]), true, item.id);
      assert.equal(availableWithExtensions(item, ['unknown-pack']), false, item.id);
    }
  }
  const modern = RULES.skills.find(item => item.id === 'workbook-fighting-chainsaw')!;
  assert.equal(availableInContext(modern, 'core', [WORKBOOK_EXTENSION_ID]), false);
  assert.equal(availableInContext(modern, 'japan', [WORKBOOK_EXTENSION_ID]), true);
});

test('public weapons cannot implicitly select a disabled Excel specialty', () => {
  const linked = RULES.equipment.filter(item => item.sourceId !== 'user-workbook-reference'
    && RULES.skills.some(skill => skill.id === item.skillId && skill.sourceId === 'user-workbook-reference'));
  assert.equal(linked.length, 14);
  const before = structuredClone(RULES);
  const disabled = rulesForExtensions(RULES);
  const enabled = rulesForExtensions(RULES, [WORKBOOK_EXTENSION_ID]);
  for (const weapon of linked) {
    assert.ok(availableWithExtensions(weapon));
    assert.equal(disabled.equipment.find(item => item.id === weapon.id)!.skillId, undefined);
    assert.equal(enabled.equipment.find(item => item.id === weapon.id)!.skillId, weapon.skillId);
  }
  assert.equal(disabled.skills.length, RULES.skills.length, 'saved definitions remain available for references');
  assert.equal(disabled.equipment.find(item => item.id === 'unarmed')!.skillId, 'fighting-brawl');
  assert.deepEqual(RULES, before);
});

test('disabling the pack hides unused skills while preserving saved allocations and printable records', () => {
  const character = blankCharacter('core');
  character.enabledExtensionIds = [WORKBOOK_EXTENSION_ID];
  const specialist = 'workbook-art-fine-art';
  assert.ok(skillsForCharacter(character, RULES).some(skill => skill.id === specialist));
  character.skills[specialist] = { occupation: 0, personal: 12, growth: 4 };
  character.occupationChoices = [specialist];
  character.inventory = [{ id: 'saved', definitionId: 'workbook-heavy-leather-jacket', name: '旧防具', quantity: 1, notes: '' }];
  character.enabledExtensionIds = [];
  const before = structuredClone(character);
  const rows = skillsForCharacter(character, RULES);
  assert.ok(rows.some(skill => skill.id === specialist));
  assert.equal(rows.some(skill => skill.id === 'workbook-art-forgery'), false);
  assert.ok(selectCardSkills(character, RULES).some(skill => skill.id === specialist));
  assert.deepEqual(character, before);
});

test('public weapons retain era-incompatible saved skills but cannot select those skills through a new weapon', () => {
  const character = blankCharacter('dark-ages');
  character.enabledExtensionIds = [WORKBOOK_EXTENSION_ID];
  const scoped = rulesForExtensions(RULES, character.enabledExtensionIds, character.rulesetId);
  const bow = scoped.equipment.find(item => item.id === 'bow-and-arrows')!;
  assert.ok(availableInContext(bow, character.rulesetId, character.enabledExtensionIds));
  assert.equal(bow.skillId, undefined);
  character.inventory = [{ id: 'bow', definitionId: bow.id, name: bow.name, quantity: 1, notes: '' }];
  assert.equal(selectCardSkills(character, RULES).some(skill => skill.id === 'workbook-firearms-bow'), false);
  character.inventory[0].skillId = 'workbook-firearms-bow';
  assert.ok(selectCardSkills(character, RULES).some(skill => skill.id === 'workbook-firearms-bow'));
  assert.equal(rulesForExtensions(RULES, character.enabledExtensionIds, 'core').equipment
    .find(item => item.id === bow.id)!.skillId, 'workbook-firearms-bow');
});

test('Gaslight aliases offer one row per equivalent skill and retain legacy allocated rows', () => {
  const character = blankCharacter('gaslight');
  const rows = skillsForCharacter(character, RULES);
  for (const [canonical, target] of [['drive-auto', 'drive-carriage'], ['psychoanalysis', 'alienism']]) {
    assert.equal(rows.some(skill => skill.id === canonical), false);
    assert.ok(rows.some(skill => skill.id === target));
  }
  character.skills['drive-auto'] = { occupation: 0, personal: 10, growth: 0 };
  assert.ok(skillsForCharacter(character, RULES).some(skill => skill.id === 'drive-auto'));
  assert.ok(selectCardSkills(character, RULES).some(skill => skill.id === 'drive-auto'));
});
