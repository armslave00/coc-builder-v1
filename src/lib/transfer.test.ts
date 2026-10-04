import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Character, CustomContent, RuleData } from '../types';
import { characterHTML, MAX_IMPORT_BYTES, parseImport, validateCustom } from './transfer';

function investigator(): Character {
  return { id: 'test', name: 'Alice', player: '', occupationId: 'professor', rulesetId: 'classic', age: 30, gender: '', birthplace: '', residence: '', portrait: '', attributes: { STR: 50, CON: 55, SIZ: 60, DEX: 61, APP: 55, INT: 70, POW: 65, EDU: 80 }, luck: 40, current: { hp: null, mp: null, san: null }, skills: { spot: { occupation: 25, personal: 5, growth: 0 } }, occupationChoices: [], inventory: [], spellIds: [], backstory: { appearance: '', ideology: '', people: '', places: '', possessions: '', traits: '', injuries: '', phobias: '', notes: '' }, money: { cash: '', assets: '', spending: '' }, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
}
const custom: CustomContent = { rulesets: [], skills: [], occupations: [], equipment: [], spells: [] };
const rules: RuleData = { version: '7.0', sources: [], rulesets: [{ id: 'classic', name: '经典时代', english: '', era: '1920', description: '', sourceId: 'core', status: '' }], occupations: [{ id: 'professor', name: '教授', english: '', description: '', formula: { edu: 4 }, credit: [20, 70], skills: ['spot'], sourceId: 'core' }], skills: [{ id: 'spot', name: '侦查', english: 'Spot Hidden', base: 25, category: '调查' }], equipment: [], spells: [] };

test('accepts single-character, multicharacter and archive JSON', () => {
  const character = investigator();
  for (const data of [{ schemaVersion: 1, character, custom }, { schemaVersion: 1, characters: [character], custom }, { schemaVersion: 1, activeId: character.id, characters: [character], custom }]) {
    const input = JSON.stringify(data); const parsed = parseImport(input);
    assert.equal(parsed.characters[0].name, 'Alice'); assert.equal(parsed.characters[0].skills.spot.personal, 5); assert.deepEqual(parsed.custom, custom);
    assert.equal(JSON.stringify(data), input);
  }
  assert.deepEqual(parseImport(JSON.stringify({ schemaVersion: 1, character })).custom, custom);
});

test('rejects unsupported versions, missing fields and invalid numbers', () => {
  assert.throws(() => parseImport('{'), /JSON/);
  assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 2, character: investigator() })), /版本/);
  const character = investigator(); character.attributes.STR = 101;
  assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 1, character })), /STR/);
  character.attributes.STR = 50; character.age = 14;
  assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 1, character })), /age/);
  character.age = 30; character.skills.spot.personal = -1;
  assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 1, character })), /personal/);
  assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 1, character: { id: 'only-id' } })), /attributes/);
});

test('rejects prototype pollution, duplicate identifiers, empty archives and oversized files', () => {
  assert.throws(() => parseImport('{"schemaVersion":1,"__proto__":{"polluted":true}}'), /不安全/);
  assert.equal(({} as { polluted?: boolean }).polluted, undefined);
  assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 1, characters: [investigator(), investigator()] })), /重复/);
  assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 1, characters: [] })), /没有人物卡/);
  assert.throws(() => parseImport(' '.repeat(MAX_IMPORT_BYTES + 1)), /12 MB/);
  assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 1, activeId: 'missing', characters: [investigator()] })), /activeId/);
});

test('accepts a complete empty Archive after deleting the final character', () => {
  assert.deepEqual(parseImport(JSON.stringify({ schemaVersion: 1, characters: [], activeId: '', custom })), { characters: [], custom });
  for (const data of [
    { schemaVersion: 1, characters: [] },
    { schemaVersion: 1, characters: [], custom },
    { schemaVersion: 1, characters: [], activeId: '' },
    { schemaVersion: 1, characters: [], activeId: 'missing', custom },
  ]) assert.throws(() => parseImport(JSON.stringify(data)), /没有人物卡/);
  assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 1, characters: [], activeId: '', custom: [] })), /必须是对象/);
});

test('portrait validation permits local paths and raster data but rejects executable URLs', () => {
  for (const path of ['/portraits/alice.svg', './portrait.png', 'https://example.com/portrait.png', 'data:image/png;base64,aGVsbG8=']) {
    const character = investigator(); character.portrait = path;
    assert.equal(parseImport(JSON.stringify({ schemaVersion: 1, character })).characters[0].portrait, path);
  }
  for (const path of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'data:image/svg+xml;base64,PHN2Zz4=', 'file:///etc/passwd', '//evil.example/x', 'https://user:pass@example.com/image.png']) {
    const character = investigator(); character.portrait = path;
    assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 1, character })), /头像/);
  }
});

test('validates original content, formula attributes and preserves optional rules', () => {
  const content: CustomContent = structuredClone(custom);
  content.skills.push({ id: 'custom-calligraphy', name: '书法', english: 'Calligraphy', category: '原创', base: 'APP/5' });
  content.rulesets.push({ id: 'custom-era', name: '原创', english: '', era: '1920', description: '', sourceId: 'custom', status: '原创', skillBaseOverrides: { spot: 10 }, skillAliases: { spot: '观察' } });
  content.occupations.push({ ...rules.occupations[0], id: 'custom-professor', choiceGroups: [{ name: '学科', count: 1, options: ['custom-calligraphy'] }], skillNotes: '选择一个专长' });
  const before = JSON.stringify(content);
  const normalized = validateCustom(content);
  assert.equal(normalized.skills[0].base, 'APP/5'); assert.equal(normalized.rulesets[0].skillBaseOverrides?.spot, 10); assert.equal(normalized.occupations[0].choiceGroups?.[0].count, 1);
  assert.equal(JSON.stringify(content), before);
  content.occupations[0].formula.other = ['BAD'];
  assert.throws(() => validateCustom(content), /属性缩写/);
  assert.throws(() => validateCustom({ skills: [normalized.skills[0], normalized.skills[0]] }), /重复/);
});

test('HTML exports two print pages, all skills and numerical half and fifth values', () => {
  const html = characterHTML(investigator(), rules);
  assert.equal((html.match(/<section class="page">/g) ?? []).length, 2);
  assert.match(html, /<td>侦查<\/td><td>55<\/td><td>27<\/td><td>11<\/td>/);
  assert.match(html, /@page\{size:A4/); assert.match(html, /break-after:page/);
  assert.match(html, /HP 当前/); assert.match(html, /背景故事/);
});

test('HTML preserves legitimate zero values in luck and current resources', () => {
  const character = investigator(); character.luck = 0; character.current = { hp: 0, mp: 0, san: 0 };
  const html = characterHTML(character, rules);
  assert.match(html, /<span>幸运 LUCK<\/span><strong>0<\/strong>/);
  assert.match(html, /<span>生命 HP 当前 \/ 最大<\/span><strong>0 \/ 11<\/strong>/);
  assert.match(html, /<span>魔法 MP 当前 \/ 最大<\/span><strong>0 \/ 13<\/strong>/);
  assert.match(html, /<span>理智 SAN 当前 \/ 上限<\/span><strong>0 \/ 99<\/strong>/);
});

test('HTML only exports the selected era, retaining unrestricted custom skills and resolving alias IDs', () => {
  const scoped = structuredClone(rules);
  scoped.rulesets.push({ id: 'gaslight', name: '煤气灯', english: '', era: '1890', description: '', sourceId: 'gaslight', status: '', skillBaseOverrides: { spot: 10 }, skillAliases: { driving: 'drive-carriage' } });
  scoped.skills.push(
    { id: 'driving', name: '驾驶', english: '', base: 20, category: '技术' },
    { id: 'drive-carriage', name: '驾驶马车', english: '', base: 20, category: '技术', eras: ['gaslight'] },
    { id: 'reassure', name: '安抚', english: '', base: 'APP/5', category: '社交', eras: ['gaslight'] },
    { id: 'computer-use', name: '计算机使用', english: '', base: 5, category: '技术', eras: ['japan'] },
    { id: 'custom-skill', name: '原创书法', english: '', base: 5, category: '原创' },
  );
  const character = investigator();
  assert.doesNotMatch(characterHTML(character, scoped), /<td>安抚<\/td>|<td>计算机使用<\/td>/);
  assert.match(characterHTML(character, scoped), /<td>原创书法<\/td>/);
  character.rulesetId = 'gaslight';
  const gaslight = characterHTML(character, scoped);
  assert.match(gaslight, /<td>安抚<\/td><td>11<\/td>/);
  assert.match(gaslight, /<td>侦查<\/td><td>40<\/td>/);
  assert.match(gaslight, /<td>驾驶马车<\/td>/);
  assert.doesNotMatch(gaslight, /<td>drive-carriage<\/td>|<td>计算机使用<\/td>/);
  character.rulesetId = 'japan';
  assert.match(characterHTML(character, scoped), /<td>计算机使用<\/td>/);
  assert.doesNotMatch(characterHTML(character, scoped), /<td>安抚<\/td>/);
});

test('HTML treats all user text as inert text, and never emits executable or remote portrait URLs', () => {
  const character = investigator(); character.name = '<script>alert("name")</script>'; character.player = '\" onerror=alert(1)';
  character.backstory.notes = '<img src=x onerror=alert(1)>';
  character.inventory.push({ id: 'knife', definitionId: 'knife', name: '<svg onload=alert(1)>', quantity: 1, notes: '</td><script>boom</script>' });
  character.portrait = 'javascript:alert(1)';
  const html = characterHTML(character, rules);
  assert.doesNotMatch(html, /<script|<svg|<img src=x|src="javascript:/);
  assert.match(html, /&lt;script&gt;alert\(&quot;name&quot;\)&lt;\/script&gt;/);
  assert.match(html, /Content-Security-Policy/);
  character.portrait = '/local/image.png'; assert.doesNotMatch(characterHTML(character, rules), /src="\/local/);
  character.portrait = 'data:image/png;base64,aGVsbG8='; assert.match(characterHTML(character, rules), /src="data:image\/png;base64,aGVsbG8="/);
});
