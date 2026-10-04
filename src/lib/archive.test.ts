import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Character, CustomContent, RuleData } from '../types';
import { mergeCustom, validateCharacterReferences } from './archive';
import { parseImport, validateCustom } from './transfer';
import { RULES } from '../data/rules';

const emptyCustom = (): CustomContent => ({ rulesets: [], skills: [], occupations: [], equipment: [], spells: [] });
const rules: RuleData = {
  version: '7.0', sources: [{ id: 'core', title: '核心', url: 'https://example.com/core', note: '' }],
  rulesets: [{ id: 'core', name: '经典时代', english: '', era: '1920', description: '', sourceId: 'core', status: '' }],
  occupations: [{ id: 'professor', name: '教授', english: '', description: '', formula: { edu: 4 }, credit: [20, 70], skills: ['spot'], sourceId: 'core' }],
  skills: [
    { id: 'spot', name: '侦查', english: 'Spot Hidden', base: 25, category: '调查' },
    { id: 'dodge', name: '闪避', english: 'Dodge', base: 'DEX/2', category: '战斗' },
    { id: 'cthulhu-mythos', name: '克苏鲁神话', english: '', base: 0, category: '神话' },
  ],
  equipment: [],
  spells: [{ id: 'spell', name: '测试法术', description: '', cost: '', sourceId: 'core' }],
};

function investigator(): Character {
  return { id: 'test', name: '调查员', player: '', occupationId: 'professor', rulesetId: 'core', age: 30, gender: '', birthplace: '', residence: '', portrait: '', attributes: { STR: 50, CON: 55, SIZ: 60, DEX: 60, APP: 55, INT: 70, POW: 65, EDU: 80 }, luck: 40, current: { hp: null, mp: null, san: null }, skills: { spot: { occupation: 25, personal: 5, growth: 0 } }, occupationChoices: ['dodge'], inventory: [], spellIds: ['spell'], backstory: { appearance: '', ideology: '', people: '', places: '', possessions: '', traits: '', injuries: '', phobias: '', notes: '' }, money: { cash: '', assets: '', spending: '' }, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
}

test('merges equal definitions once despite object key order and optional undefined fields', () => {
  const existing = emptyCustom();
  existing.occupations.push({ ...rules.occupations[0], id: 'custom-professor', formula: { edu: 2, other: ['DEX', 'STR'], factor: 2 } });
  const incoming = validateCustom(existing);
  incoming.occupations[0].formula = { factor: 2, other: ['DEX', 'STR'], edu: 2 };
  const before = JSON.stringify([existing, incoming]);
  const merged = mergeCustom(existing, incoming, rules);
  assert.equal(merged.occupations.length, 1);
  assert.equal(JSON.stringify([existing, incoming]), before);
  merged.occupations[0].formula.edu = 4;
  assert.equal(existing.occupations[0].formula.edu, 2);
});

test('rejects changed custom definitions and builtin ID collisions while accepting exact builtin duplicates', () => {
  const existing = emptyCustom(); existing.skills.push({ ...rules.skills[0], id: 'custom-spot' });
  const incoming = structuredClone(existing); incoming.skills[0].base = 5;
  assert.throws(() => mergeCustom(existing, incoming, rules), /custom-spot.*冲突/);
  const builtinDuplicate = emptyCustom(); builtinDuplicate.skills.push(structuredClone(rules.skills[0]));
  assert.deepEqual(mergeCustom(emptyCustom(), builtinDuplicate, rules), emptyCustom());
  builtinDuplicate.skills[0].base = 1;
  assert.throws(() => mergeCustom(emptyCustom(), builtinDuplicate, rules), /spot.*冲突/);
});

test('legacy builtin duplicates may omit only new metadata and never replace builtin definitions', () => {
  const scoped = structuredClone(rules);
  scoped.skills[0].description = '内置简介'; scoped.skills[0].scenarios = ['检查现场'];
  scoped.rulesets[0].skillDescriptions = { spot: { description: '时代简介', scenarios: ['检查古物'] } };
  scoped.equipment.push({ id: 'knife', name: '小刀', category: '近战', description: '小型刀具', price: '', sourceId: 'core', damage: '1D4 + DB', kind: 'weapon', skillId: 'spot' });
  const incoming = emptyCustom();
  incoming.skills.push({ ...rules.skills[0] });
  incoming.rulesets.push({ ...rules.rulesets[0] });
  const { kind: _kind, skillId: _skillId, ...legacyKnife } = scoped.equipment[0];
  incoming.equipment.push(legacyKnife);
  const before = JSON.stringify([scoped, incoming]);
  assert.deepEqual(mergeCustom(emptyCustom(), incoming, scoped), emptyCustom());
  assert.equal(JSON.stringify([scoped, incoming]), before);
  for (const edit of [
    (content: CustomContent) => { content.skills[0].description = '不同简介'; },
    (content: CustomContent) => { content.skills[0].scenarios = []; },
    (content: CustomContent) => { content.skills[0].base = 1; },
    (content: CustomContent) => { content.rulesets[0].skillDescriptions = {}; },
    (content: CustomContent) => { content.rulesets[0].era = '1890'; },
    (content: CustomContent) => { content.equipment[0].kind = 'item'; },
    (content: CustomContent) => { content.equipment[0].skillId = 'dodge'; },
    (content: CustomContent) => { content.equipment[0].damage = '1D8 + DB'; },
  ]) {
    const changed = structuredClone(incoming); edit(changed);
    assert.throws(() => mergeCustom(emptyCustom(), changed, scoped), /冲突/);
  }
  const existing = emptyCustom(); existing.skills.push({ ...scoped.skills[0], id: 'custom-spot' });
  const olderCustom = emptyCustom(); olderCustom.skills.push({ ...rules.skills[0], id: 'custom-spot' });
  assert.throws(() => mergeCustom(existing, olderCustom, scoped), /custom-spot.*冲突/);
});

test('resolves references between incoming custom entries and preserves eras and free alias labels', () => {
  const incoming = emptyCustom();
  incoming.rulesets.push({ ...rules.rulesets[0], id: 'custom-era', skillBaseOverrides: { 'custom-skill': 10 }, skillAliases: { 'custom-skill': '任意别名', spot: 'a-free-display-label' } });
  incoming.skills.push({ id: 'custom-skill', name: '书法', english: '', category: '原创', base: 5, eras: ['custom-era'] });
  incoming.occupations.push({ ...rules.occupations[0], id: 'custom-professor', skills: ['custom-skill'], choiceGroups: [{ name: '专长', count: 1, options: ['dodge', 'custom-skill'] }], eras: ['custom-era'] });
  assert.deepEqual(mergeCustom(emptyCustom(), incoming, rules), incoming);
});

test('rejects missing skill references in custom occupations, choice groups, overrides and alias keys', () => {
  const incoming = emptyCustom();
  incoming.occupations.push({ ...rules.occupations[0], id: 'custom-professor', skills: ['missing-skill'] });
  assert.throws(() => mergeCustom(emptyCustom(), incoming, rules), /原创职业.*missing-skill.*未找到/);
  incoming.occupations[0].skills = ['spot'];
  incoming.occupations[0].choiceGroups = [{ name: '专长', count: 1, options: ['missing-skill'] }];
  assert.throws(() => mergeCustom(emptyCustom(), incoming, rules), /可选组.*missing-skill.*未找到/);
  incoming.occupations = [];
  incoming.rulesets.push({ ...rules.rulesets[0], id: 'custom-era', skillBaseOverrides: { 'missing-skill': 10 } });
  assert.throws(() => mergeCustom(emptyCustom(), incoming, rules), /基础值覆盖.*missing-skill.*未找到/);
  incoming.rulesets[0].skillBaseOverrides = {};
  incoming.rulesets[0].skillAliases = { 'missing-skill': '显示名称' };
  assert.throws(() => mergeCustom(emptyCustom(), incoming, rules), /技能别名.*missing-skill.*未找到/);
});

test('checks custom era skill descriptions and equipment skill references after merging skills', () => {
  const incoming = emptyCustom();
  incoming.rulesets.push({ ...rules.rulesets[0], id: 'custom-era', skillDescriptions: { 'custom-skill': { description: '原创说明', scenarios: [] } } });
  incoming.equipment.push({ id: 'custom-tool', name: '调查工具', category: '原创', description: '', price: '', sourceId: 'custom', kind: 'weapon', skillId: 'custom-skill' });
  assert.throws(() => mergeCustom(emptyCustom(), incoming, rules), /技能说明.*custom-skill.*未找到/);
  incoming.skills.push({ id: 'custom-skill', name: '原创调查', english: '', base: 1, category: '调查' });
  assert.deepEqual(mergeCustom(emptyCustom(), incoming, rules), { ...incoming, legacySourceIds: ['custom'] });
  incoming.equipment[0].skillId = 'missing-skill';
  assert.throws(() => mergeCustom(emptyCustom(), incoming, rules), /原创装备.*missing-skill.*未找到/);
  incoming.equipment[0].skillId = 'spot';
  assert.doesNotThrow(() => mergeCustom(emptyCustom(), incoming, rules));
});

test('merges source catalogs before checking provenance and references across incoming definitions', () => {
  const incoming = emptyCustom();
  incoming.sources = [{ id: 'custom-source', title: '扩展资料', url: 'https://example.com/rules', note: '版本锚点', publisher: '作者', year: 2026, edition: '7e', kind: 'original', coverage: { occupations: 'partial', skills: 'complete', equipment: 'partial' } }];
  incoming.skills.push({ id: 'custom-language', name: '语言', english: '', category: '知识', base: 1, specialization: true, sourceId: 'custom-source' });
  incoming.skills.push({ id: 'custom-latin', name: '拉丁语', english: '', category: '知识', base: 1, parentId: 'custom-language', sourceId: 'custom-source' });
  incoming.occupations.push({ ...rules.occupations[0], id: 'custom-scholar', sourceId: 'custom-source', verificationSourceIds: ['custom-source'], skills: ['custom-latin'] });
  incoming.rulesets.push({ ...rules.rulesets[0], id: 'custom-era', sourceId: 'custom-source' });
  incoming.equipment.push({ id: 'custom-tool', name: '工具', category: '', description: '', price: '', sourceId: 'custom-source', verificationSourceIds: ['custom-source'], skillId: 'custom-latin' });
  incoming.spells.push({ ...rules.spells[0], id: 'custom-spell', sourceId: 'custom-source' });
  const before = JSON.stringify(incoming);
  const merged = mergeCustom(emptyCustom(), validateCustom(incoming), rules);
  assert.equal(JSON.stringify(merged), JSON.stringify(validateCustom(incoming)));
  assert.equal(JSON.stringify(incoming), before);
  const withDuplicateSource = emptyCustom(); withDuplicateSource.sources = structuredClone(incoming.sources);
  assert.equal(mergeCustom(merged, withDuplicateSource, rules).sources?.length, 1);
  const changed = structuredClone(withDuplicateSource); changed.sources![0].edition = '6e';
  assert.throws(() => mergeCustom(merged, changed, rules), /来源.*custom-source.*冲突/);
  const scoped = structuredClone(rules); scoped.sources = structuredClone(incoming.sources);
  assert.deepEqual(mergeCustom(emptyCustom(), withDuplicateSource, scoped).sources, []);
  const changedBuiltin = structuredClone(withDuplicateSource); changedBuiltin.sources![0].coverage!.skills = 'partial';
  assert.throws(() => mergeCustom(emptyCustom(), changedBuiltin, scoped), /来源.*custom-source.*冲突/);
});

test('complete builtin original source copies normalize and deduplicate without an external URL', () => {
  const original = RULES.sources.find(source => source.id === 'project-original')!;
  const incoming = validateCustom({ ...emptyCustom(), sources: [structuredClone(original)] });
  assert.deepEqual(mergeCustom(emptyCustom(), incoming, RULES), { ...emptyCustom(), sources: [] });
  assert.equal(original.url, '');
});

test('validates new source references while retaining legacy source labels and original workshop entries', () => {
  const scoped = structuredClone(rules);
  const legacy = emptyCustom();
  legacy.equipment.push({ id: 'old-tool', name: '旧工具', category: '', description: '', price: '', sourceId: 'legacy-book-label' });
  assert.equal(mergeCustom(emptyCustom(), legacy, scoped).equipment[0].sourceId, 'legacy-book-label');
  const newFormat = structuredClone(legacy); newFormat.sources = [];
  assert.throws(() => mergeCustom(emptyCustom(), newFormat, scoped), /来源.*legacy-book-label.*未找到/);
  assert.doesNotThrow(() => mergeCustom(legacy, { ...emptyCustom(), sources: [] }, scoped));
  newFormat.equipment[0].sourceId = 'original';
  assert.doesNotThrow(() => mergeCustom(emptyCustom(), newFormat, scoped));
  for (const kind of ['rulesets', 'occupations', 'equipment', 'spells', 'skills', 'verification', 'equipment-verification'] as const) {
    const incoming = { ...emptyCustom(), sources: [] };
    if (kind === 'rulesets') incoming.rulesets.push({ ...rules.rulesets[0], id: 'custom-era', sourceId: 'missing-source' });
    if (kind === 'occupations') incoming.occupations.push({ ...rules.occupations[0], id: 'custom-professor', sourceId: 'missing-source' });
    if (kind === 'equipment') incoming.equipment.push({ ...newFormat.equipment[0], sourceId: 'missing-source' });
    if (kind === 'spells') incoming.spells.push({ ...rules.spells[0], id: 'custom-spell', sourceId: 'missing-source' });
    if (kind === 'skills') incoming.skills.push({ ...rules.skills[0], id: 'custom-skill', sourceId: 'missing-source' });
    if (kind === 'verification') incoming.occupations.push({ ...rules.occupations[0], id: 'custom-professor', verificationSourceIds: ['missing-source'] });
    if (kind === 'equipment-verification') incoming.equipment.push({ ...newFormat.equipment[0], verificationSourceIds: ['missing-source'] });
    assert.throws(() => mergeCustom(emptyCustom(), incoming, scoped), /来源.*missing-source.*未找到/);
  }
  const newSkillMetadata = emptyCustom(); newSkillMetadata.skills.push({ ...rules.skills[0], id: 'custom-skill', sourceId: 'missing-source' });
  assert.throws(() => mergeCustom(emptyCustom(), newSkillMetadata, scoped), /来源.*missing-source.*未找到/);
});

test('legacy source markers preserve mixed archives across export and fresh-device import', () => {
  const legacy = emptyCustom();
  legacy.occupations.push({ ...rules.occupations[0], id: 'old-scholar', sourceId: 'legacy-book' });
  const incoming = { ...emptyCustom(), sources: [{ id: 'new-source', title: '新资料', url: 'https://example.com/new', note: '' }] };
  incoming.equipment.push({ id: 'new-tool', name: '新工具', category: '', description: '', price: '', sourceId: 'new-source' });
  const merged = mergeCustom(legacy, incoming, rules);
  assert.deepEqual(merged.legacySourceIds, ['legacy-book']);
  const exported = JSON.stringify({ schemaVersion: 1, character: investigator(), custom: merged });
  const parsed = parseImport(exported);
  const reimported = mergeCustom(emptyCustom(), parsed.custom, rules);
  assert.equal(reimported.occupations[0].sourceId, 'legacy-book');
  assert.equal(reimported.sources?.[0].id, 'new-source');
  assert.deepEqual(reimported.legacySourceIds, ['legacy-book']);
  const withProvenance = structuredClone(parsed.custom);
  withProvenance.sources!.push({ id: 'legacy-book', title: '已核实资料', url: 'https://example.com/verified', note: '' });
  assert.deepEqual(mergeCustom(emptyCustom(), withProvenance, rules).legacySourceIds, []);
  const unverifiedSkill = { ...emptyCustom(), sources: [], legacySourceIds: ['legacy-book'] };
  unverifiedSkill.skills.push({ ...rules.skills[0], id: 'new-skill', sourceId: 'legacy-book' });
  assert.throws(() => mergeCustom(emptyCustom(), unverifiedSkill, rules), /来源.*legacy-book.*未找到/);
  const unverifiedReferences = { ...emptyCustom(), sources: [], legacySourceIds: ['legacy-book'] };
  unverifiedReferences.occupations.push({ ...rules.occupations[0], id: 'new-professor', verificationSourceIds: ['legacy-book'] });
  assert.throws(() => mergeCustom(emptyCustom(), unverifiedReferences, rules), /校核来源.*legacy-book.*未找到/);
});

test('rejects missing specialization parents and cyclic parent relationships', () => {
  const incoming = emptyCustom();
  incoming.skills.push({ ...rules.skills[0], id: 'custom-skill', parentId: 'missing-parent' });
  assert.throws(() => mergeCustom(emptyCustom(), incoming, rules), /父技能.*missing-parent.*未找到/);
  incoming.skills[0].parentId = 'custom-skill';
  assert.throws(() => mergeCustom(emptyCustom(), incoming, rules), /父技能.*循环/);
  incoming.skills[0].parentId = 'custom-parent';
  incoming.skills.push({ ...rules.skills[0], id: 'custom-parent', parentId: 'custom-skill' });
  assert.throws(() => mergeCustom(emptyCustom(), incoming, rules), /父技能.*循环/);
  incoming.skills[1].parentId = 'spot';
  assert.doesNotThrow(() => mergeCustom(emptyCustom(), incoming, rules));
});

test('legacy builtin copies omit added metadata without replacing canonical source or rule definitions', () => {
  const scoped = structuredClone(rules);
  scoped.sources = [{ id: 'core', title: '核心', url: 'https://example.com/core', note: '', publisher: '出版社', year: 2026, edition: '7e', kind: 'core', coverage: { occupations: 'partial', skills: 'partial', equipment: 'partial' } }];
  Object.assign(scoped.skills[0], { sourceId: 'core', parentId: 'dodge', specialization: false, eras: ['core'], note: '新版数据说明' });
  Object.assign(scoped.occupations[0], { version: '7e', eraNote: '时代说明', verificationSourceIds: ['core'] });
  scoped.rulesets[0].notes = ['时代说明'];
  scoped.equipment.push({ id: 'rifle', name: '步枪', category: '', description: '', price: '', sourceId: 'core', verificationSourceIds: ['core'], eras: ['core'], ammo: '5', malfunction: '100', armor: '—' });
  const incoming = emptyCustom();
  incoming.sources = [{ id: 'core', title: '核心', url: 'https://example.com/core', note: '' }];
  incoming.skills.push(structuredClone(rules.skills[0]));
  incoming.occupations.push(structuredClone(rules.occupations[0]));
  incoming.rulesets.push(structuredClone(rules.rulesets[0]));
  incoming.equipment.push({ id: 'rifle', name: '步枪', category: '', description: '', price: '', sourceId: 'core' });
  const before = JSON.stringify([incoming, scoped]);
  assert.deepEqual(mergeCustom(emptyCustom(), validateCustom(incoming), scoped), { ...emptyCustom(), sources: [] });
  assert.equal(JSON.stringify([incoming, scoped]), before);
  for (const edit of [
    (content: CustomContent) => { content.skills[0].sourceId = 'other-source'; },
    (content: CustomContent) => { content.skills[0].parentId = 'cthulhu-mythos'; },
    (content: CustomContent) => { content.skills[0].eras = []; },
    (content: CustomContent) => { content.occupations[0].version = '6e'; },
    (content: CustomContent) => { content.rulesets[0].notes = []; },
    (content: CustomContent) => { content.equipment[0].ammo = '6'; },
    (content: CustomContent) => { content.sources![0].year = 2025; },
  ]) {
    const changed = structuredClone(incoming); edit(changed);
    assert.throws(() => mergeCustom(emptyCustom(), changed, scoped), /冲突/);
  }
});

test('inventory permits unavailable legacy definitions but checks every explicit skill reference', () => {
  const character = investigator();
  character.inventory.push({ id: 'legacy-tool', definitionId: 'unavailable-tool', name: '旧工具', quantity: 1, notes: '' });
  assert.doesNotThrow(() => validateCharacterReferences([character], rules));
  character.inventory[0].skillId = 'spot';
  assert.doesNotThrow(() => validateCharacterReferences([character], rules));
  character.inventory[0].skillId = 'missing-skill';
  assert.throws(() => validateCharacterReferences([character], rules), /调查员.*装备.*missing-skill.*未找到/);
});

test('accepts known character references including allocated skills from another era', () => {
  const scoped = structuredClone(rules);
  scoped.skills.push({ id: 'old-era-skill', name: '历史技能', english: '', category: '', base: 5, eras: ['gaslight'] });
  const character = investigator();
  character.skills['old-era-skill'] = { occupation: 0, personal: 10, growth: 0 };
  assert.doesNotThrow(() => validateCharacterReferences([character], scoped));
  assert.doesNotThrow(() => validateCharacterReferences([], scoped));
});

test('rejects unknown character ruleset, occupation, skill, optional skill and spell references', () => {
  for (const kind of ['ruleset', 'occupation', 'skill', 'choice', 'spell'] as const) {
    const character = investigator();
    if (kind === 'ruleset') character.rulesetId = 'missing-rule';
    if (kind === 'occupation') character.occupationId = 'missing-occupation';
    if (kind === 'skill') character.skills['missing-skill'] = { occupation: 0, personal: 0, growth: 0 };
    if (kind === 'choice') character.occupationChoices.push('missing-choice');
    if (kind === 'spell') character.spellIds.push('missing-spell');
    assert.throws(() => validateCharacterReferences([character], rules), /调查员.*missing-.*未找到/);
  }
});

test('checks skill limit using era overrides and dynamic bases and accepts the 99 boundary', () => {
  const scoped = structuredClone(rules); scoped.rulesets[0].skillBaseOverrides = { spot: 70 };
  const character = investigator();
  assert.throws(() => validateCharacterReferences([character], scoped), /侦查.*100.*超过 99/);
  character.skills.spot.personal = 4;
  assert.doesNotThrow(() => validateCharacterReferences([character], scoped));
  character.skills.dodge = { occupation: 60, personal: 10, growth: 0 };
  assert.throws(() => validateCharacterReferences([character], scoped), /闪避.*100.*超过 99/);
});

test('mythos permits growth only and rejects either occupation or personal allocation', () => {
  const character = investigator();
  character.skills['cthulhu-mythos'] = { occupation: 0, personal: 0, growth: 99 };
  assert.doesNotThrow(() => validateCharacterReferences([character], rules));
  character.skills['cthulhu-mythos'].occupation = 1;
  assert.throws(() => validateCharacterReferences([character], rules), /克苏鲁神话.*职业点或兴趣点/);
  character.skills['cthulhu-mythos'].occupation = 0; character.skills['cthulhu-mythos'].personal = 1;
  assert.throws(() => validateCharacterReferences([character], rules), /克苏鲁神话.*职业点或兴趣点/);
});
