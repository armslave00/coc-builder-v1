import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Character, Occupation, Ruleset, SkillDefinition } from '../types';
import { ageGuidance, applyAge, derive, getSkillBase, getSkillTotal, rollAttributes, rollLuck } from './rules';

function investigator(): Character {
  return { id: 'test', name: '调查员', player: '', occupationId: 'professor', rulesetId: 'classic', age: 30, gender: '', birthplace: '', residence: '', portrait: '', attributes: { STR: 50, CON: 55, SIZ: 60, DEX: 61, APP: 55, INT: 70, POW: 65, EDU: 80 }, luck: 40, current: { hp: null, mp: null, san: null }, skills: {}, occupationChoices: [], inventory: [], spellIds: [], backstory: { appearance: '', ideology: '', people: '', places: '', possessions: '', traits: '', injuries: '', phobias: '', notes: '' }, money: { cash: '', assets: '', spending: '' }, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
}
function withRandom(value: number, action: () => void) { const original = Math.random; Math.random = () => value; try { action(); } finally { Math.random = original; } }

test('derived values floor HP and MP and include every allocated point', () => {
  const character = investigator();
  character.skills.spot = { occupation: 25, personal: 10, growth: 4 };
  character.skills['cthulhu-mythos'] = { occupation: 0, personal: 0, growth: 40 };
  const result = derive(character);
  assert.equal(result.hp, 11); assert.equal(result.mp, 13); assert.equal(result.maxSan, 59); assert.equal(result.san, 59);
  assert.equal(result.occupationPoints, 320); assert.equal(result.personalPoints, 140);
  assert.equal(result.occupationSpent, 25); assert.equal(result.personalSpent, 10);
});

test('damage bonus and build agree at all human and extended boundaries', () => {
  for (const [total, build, bonus] of [[64, -2, '−2'], [65, -1, '−1'], [84, -1, '−1'], [85, 0, '0'], [124, 0, '0'], [125, 1, '+1D4'], [164, 1, '+1D4'], [165, 2, '+1D6'], [204, 2, '+1D6'], [205, 3, '+2D6'], [284, 3, '+2D6'], [285, 4, '+3D6']] as const) {
    const character = investigator(); character.attributes.STR = Math.floor(total / 2); character.attributes.SIZ = total - character.attributes.STR;
    assert.equal(derive(character).build, build); assert.equal(derive(character).damageBonus, bonus);
  }
});

test('movement checks both characteristics including equality and age bands', () => {
  const character = investigator(); character.attributes.SIZ = 60;
  character.attributes.STR = 59; character.attributes.DEX = 59; assert.equal(derive(character).move, 7);
  character.attributes.STR = 60; assert.equal(derive(character).move, 8);
  character.attributes.STR = 61; character.attributes.DEX = 61; assert.equal(derive(character).move, 9);
  for (const [age, move] of [[39, 9], [40, 8], [49, 8], [50, 7], [60, 6], [70, 5], [80, 4], [89, 4]]) { character.age = age; assert.equal(derive(character).move, move); }
});

test('occupation formula selects the largest permitted characteristic', () => {
  const character = investigator();
  const occupation: Occupation = { id: 'detective', name: '', english: '', description: '', formula: { edu: 2, other: ['STR', 'DEX'], factor: 2 }, credit: [9, 30], skills: [], sourceId: 'core' };
  assert.equal(derive(character, occupation).occupationPoints, 282);
});

test('skill bases follow EDU, half DEX, fifth APP and era overrides', () => {
  const character = investigator();
  const skill: SkillDefinition = { id: 'dodge', name: '', english: '', base: 'DEX/2', category: '' };
  assert.equal(getSkillBase(skill, character), 30);
  assert.equal(getSkillBase({ ...skill, base: 'EDU' }, character), 80);
  assert.equal(getSkillBase({ ...skill, base: 'APP/5' }, character), 11);
  character.skills.dodge = { occupation: 10, personal: 5, growth: 3 };
  assert.equal(getSkillTotal(skill, character), 48);
  const ruleset: Ruleset = { id: 'gaslight', name: '', english: '', era: '', description: '', sourceId: 'gaslight', status: '', skillBaseOverrides: { dodge: 20 } };
  assert.equal(getSkillTotal(skill, character, ruleset), 38);
});

test('attribute dice use the correct formula at minimum and maximum', () => {
  withRandom(0, () => { const values = rollAttributes(); assert.equal(values.STR, 15); assert.equal(values.POW, 15); assert.equal(values.SIZ, 40); assert.equal(values.INT, 40); assert.equal(values.EDU, 40); assert.equal(rollLuck(), 15); });
  withRandom(0.999, () => { for (const value of Object.values(rollAttributes())) assert.equal(value, 90); assert.equal(rollLuck(), 90); });
});

test('age adjustment is explicit, immutable and applies young investigator luck', () => {
  const character = investigator(); character.age = 19;
  const before = JSON.stringify(character);
  withRandom(0.999, () => { const result = applyAge(character); assert.equal(result.attributes.STR + result.attributes.SIZ, 105); assert.equal(result.attributes.EDU, 75); assert.equal(result.luck, 90); });
  assert.equal(JSON.stringify(character), before);
  assert.match(ageGuidance(19), /最终属性/); assert.match(ageGuidance(19), /使用一次/);
});

test('older investigators use age-table total penalties instead of accumulating bands', () => {
  for (const [age, reduction, appReduction] of [[40, 5, 5], [50, 10, 10], [60, 20, 15], [70, 40, 20], [80, 80, 25]]) {
    const character = investigator(); character.age = age;
    withRandom(0, () => { const result = applyAge(character); assert.equal(result.attributes.STR + result.attributes.CON + result.attributes.DEX, 166 - reduction); assert.equal(result.attributes.APP, 55 - appReduction); assert.equal(result.attributes.EDU, 80); });
  }
});

test('EDU improvement checks repeat against updated EDU and respect maximum 99', () => {
  const character = investigator(); character.age = 60;
  withRandom(0.999, () => assert.equal(applyAge(character).attributes.EDU, 99));
  character.age = 30;
  withRandom(0.999, () => assert.equal(applyAge(character).attributes.EDU, 90));
  character.age = 14; assert.throws(() => applyAge(character), /15–89/);
  character.age = 90; assert.throws(() => applyAge(character), /15–89/);
});
