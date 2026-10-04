import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RULES } from '../data/rules';
import { blankCharacter } from '../data/samples';
import type { Occupation, SkillDefinition } from '../types';
import { selectCardSkills } from './card-skills';

const skill = (id: string, properties: Partial<SkillDefinition> = {}): SkillDefinition => ({
  id, name: id, english: '', base: 5, category: '技术', ...properties,
});

function fixture(skills: SkillDefinition[], occupation: Partial<Occupation> = {}) {
  const rules = structuredClone(RULES);
  rules.skills = skills;
  rules.equipment = [];
  rules.rulesets = [{ ...rules.rulesets[0], id: 'core', skillAliases: {} }];
  rules.occupations = [{
    id: 'fixture', name: '测试职业', english: '', description: '', formula: { edu: 4 },
    credit: [0, 99], skills: [], sourceId: 'core', ...occupation,
  }];
  const character = blankCharacter('core');
  character.occupationId = 'fixture';
  return { character, rules };
}

const selectedIds = (data: ReturnType<typeof fixture>) => selectCardSkills(data.character, data.rules).map(entry => entry.id);

test('ordinary skills follow their era while unused specializations and zero allocations stay hidden', () => {
  const data = fixture([
    skill('ordinary'), skill('current', { eras: ['core'] }), skill('other-era', { eras: ['japan'] }),
    skill('unused', { specialization: true }), skill('zero', { specialization: true }),
  ]);
  data.character.skills.zero = { occupation: 0, personal: 0, growth: 0 };
  assert.deepEqual(selectedIds(data), ['ordinary', 'current']);
});

test('fixed generic career skills do not select all of their child specializations', () => {
  const data = fixture([
    skill('parent', { specialization: true }),
    skill('fixed-child', { specialization: true, parentId: 'parent' }),
    skill('unused-child', { specialization: true, parentId: 'parent' }),
  ], { skills: ['parent', 'fixed-child'] });
  assert.deepEqual(selectedIds(data), ['parent', 'fixed-child']);
});

test('legacy art and science children remain specializations even without an explicit specialization flag', () => {
  const data = fixture([
    skill('ordinary'), skill('art-parent', { specialization: true }), skill('science-parent', { specialization: true }),
    skill('art-child', { parentId: 'art-parent' }), skill('science-child', { parentId: 'science-parent' }),
    skill('unused-science-child', { parentId: 'science-parent' }),
  ], { skills: ['science-parent'], choiceCount: 1 });
  data.character.occupationChoices = ['art-child'];
  data.character.skills['science-child'] = { occupation: 0, personal: 1, growth: 0 };
  assert.deepEqual(selectedIds(data), ['ordinary', 'science-parent', 'art-child', 'science-child']);
});

test('group choices and unrestricted career choices retain chosen specializations without selecting unused options', () => {
  const data = fixture([
    skill('chosen', { specialization: true }), skill('unused', { specialization: true }),
    skill('free-choice', { specialization: true }),
  ], { choiceCount: 1, choiceGroups: [{ name: '专长', count: 1, options: ['chosen', 'unused'] }] });
  data.character.occupationChoices = ['chosen', 'free-choice'];
  assert.deepEqual(selectedIds(data), ['chosen', 'free-choice']);
  data.rules.occupations[0].choiceCount = 0;
  assert.deepEqual(selectedIds(data), ['chosen']);
});

test('stale or unavailable career choices do not make unallocated specializations appear', () => {
  const data = fixture([
    skill('stale', { specialization: true }),
    skill('unavailable', { specialization: true, eras: ['japan'] }),
  ], { choiceGroups: [{ name: '专长', count: 1, options: ['unavailable'] }] });
  data.character.occupationChoices = ['stale', 'unavailable'];
  assert.deepEqual(selectedIds(data), []);
  data.character.skills.unavailable = { occupation: 0, personal: 1, growth: 0 };
  assert.deepEqual(selectedIds(data), ['unavailable']);
});

test('saved choices without a current occupation do not authorize unallocated specializations', () => {
  const data = fixture([skill('selected', { specialization: true })], { choiceCount: 1 });
  data.character.occupationId = 'missing-occupation';
  data.character.occupationChoices = ['selected'];
  assert.deepEqual(selectedIds(data), []);
});

test('any positive occupation, personal or growth allocation preserves skills across eras without changing saved data', () => {
  const data = fixture([
    skill('occupation', { specialization: true, eras: ['japan'] }),
    skill('personal', { specialization: true, eras: ['japan'] }),
    skill('growth', { specialization: true, eras: ['japan'] }),
    skill('ordinary-abroad', { eras: ['japan'] }),
  ]);
  data.character.skills = {
    occupation: { occupation: 1, personal: 0, growth: 0 }, personal: { occupation: 0, personal: 1, growth: 0 },
    growth: { occupation: 0, personal: 0, growth: 1 }, 'ordinary-abroad': { occupation: 0, personal: 2, growth: 0 },
  };
  const characterBefore = structuredClone(data.character);
  const rulesBefore = structuredClone(data.rules);
  assert.deepEqual(selectedIds(data), ['occupation', 'personal', 'growth', 'ordinary-abroad']);
  assert.deepEqual(data.character, characterBefore);
  assert.deepEqual(data.rules, rulesBefore);
});

test('inventory keeps associated skills across eras and respects per-item skill overrides', () => {
  const data = fixture([
    skill('definition-skill', { specialization: true, eras: ['japan'] }),
    skill('override-skill', { specialization: true, eras: ['japan'] }),
    skill('ordinary-abroad', { eras: ['japan'] }),
  ]);
  data.rules.equipment = [{ id: 'weapon', name: '武器', category: '武器', description: '', price: '', sourceId: 'core', kind: 'weapon', skillId: 'definition-skill' }];
  data.character.inventory = [
    { id: 'one', definitionId: 'weapon', name: '武器', quantity: 1, notes: '' },
    { id: 'two', definitionId: 'custom', name: '自定物品', quantity: 1, notes: '', skillId: 'ordinary-abroad' },
  ];
  const before = structuredClone(data.character);
  assert.deepEqual(selectedIds(data), ['definition-skill', 'ordinary-abroad']);
  assert.deepEqual(data.character, before);
  data.character.inventory[0].skillId = 'override-skill';
  assert.deepEqual(selectedIds(data), ['override-skill', 'ordinary-abroad']);
});

test('career aliases map real skill IDs for fixed and selected skills while display labels retain the original ID', () => {
  const data = fixture([
    skill('old-fixed', { specialization: true, eras: ['japan'] }),
    skill('new-fixed', { specialization: true, eras: ['core'] }),
    skill('old-choice', { specialization: true, eras: ['japan'] }),
    skill('new-choice', { specialization: true, eras: ['core'] }),
    skill('label-only', { specialization: true }),
  ], { skills: ['old-fixed', 'label-only'], choiceGroups: [{ name: '时代专业', count: 1, options: ['old-choice'] }] });
  data.rules.rulesets[0].skillAliases = { 'old-fixed': 'new-fixed', 'old-choice': 'new-choice', 'label-only': '时代显示名' };
  data.character.occupationChoices = ['old-choice'];
  const before = structuredClone(data.character);
  assert.deepEqual(selectedIds(data), ['new-fixed', 'new-choice', 'label-only']);
  assert.deepEqual(data.character, before);
  data.character.occupationChoices = ['new-choice'];
  assert.deepEqual(selectedIds(data), ['new-fixed', 'new-choice', 'label-only']);
  data.character.skills['old-choice'] = { occupation: 0, personal: 1, growth: 0 };
  assert.deepEqual(selectedIds(data), ['new-fixed', 'old-choice', 'new-choice', 'label-only']);
});

test('custom eras retain core availability for ordinary and actually selected specialist skills', () => {
  const data = fixture([
    skill('ordinary', { eras: ['core'] }), skill('selected', { eras: ['core'], specialization: true }),
    skill('unused', { eras: ['core'], specialization: true }),
  ], { skills: ['selected'] });
  data.character.rulesetId = 'custom-era';
  assert.deepEqual(selectedIds(data), ['ordinary', 'selected']);
});
