import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Character, CustomContent, RuleData } from '../types';
import { characterHTML, MAX_IMPORT_BYTES, parseImport, validateCustom } from './transfer';
import { RULES } from '../data/rules';

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

test('imports old armor as zero and preserves explicit armor and weapon metadata', () => {
  const character = investigator();
  const imported = () => parseImport(JSON.stringify({ schemaVersion: 1, character })).characters[0];
  assert.deepEqual(imported().armor, { value: 0, notes: '' });
  character.armor = { value: 5, notes: '防弹衣，仅保护躯干' };
  character.inventory.push({ id: 'custom-blade', definitionId: 'custom-blade', name: '刀', quantity: 1, notes: '', kind: 'weapon', skillId: 'fighting-brawl', damage: '1D4 + DB' });
  assert.deepEqual(imported().armor, character.armor);
  assert.equal(imported().inventory[0].kind, 'weapon');
  assert.equal(imported().inventory[0].skillId, 'fighting-brawl');
  assert.equal(imported().inventory[0].damage, '1D4 + DB');
  for (const value of [-1, 1000, 1.5, '5', null]) {
    assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 1, character: { ...character, armor: { value, notes: '' } } })), /armor.value/);
  }
  for (const armor of [null, { value: 0 }, { value: 0, notes: 'x'.repeat(5001) }]) {
    assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 1, character: { ...character, armor } })), /armor/);
  }
  for (const extra of [{ kind: 'armor' }, { skillId: 'constructor' }]) {
    assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 1, character: { ...character, inventory: [{ ...character.inventory[0], ...extra }] } })), /kind|skillId/);
  }
});

test('original skill help and weapon fields survive normalization with bounded validation', () => {
  const content: CustomContent = structuredClone(custom);
  content.skills.push({ id: 'custom-research', name: '调查', english: '', category: '原创', base: 10, description: '原创技能说明', scenarios: ['调查旧书'] });
  content.rulesets.push({ ...rules.rulesets[0], id: 'custom-era', skillDescriptions: { 'custom-research': { description: '时代中的用法', scenarios: ['阅读古文'] } } });
  content.equipment.push({ id: 'custom-sword', name: '剑', category: '原创', description: '', price: '', sourceId: 'custom', kind: 'weapon', skillId: 'custom-research' });
  const imported = validateCustom(content);
  assert.equal(imported.skills[0].description, '原创技能说明');
  assert.deepEqual(imported.skills[0].scenarios, ['调查旧书']);
  assert.deepEqual(imported.rulesets[0].skillDescriptions, content.rulesets[0].skillDescriptions);
  assert.equal(imported.equipment[0].kind, 'weapon');
  assert.equal(imported.equipment[0].skillId, 'custom-research');
  for (const help of [{ description: 10 }, { description: 'x'.repeat(2001) }, { scenarios: ['x'.repeat(301)] }, { scenarios: Array(9).fill('场景') }, { scenarios: [123] }]) {
    assert.throws(() => validateCustom({ ...content, skills: [{ ...content.skills[0], ...help }] }), /description|scenarios/);
  }
  assert.throws(() => validateCustom({ ...content, rulesets: [{ ...content.rulesets[0], skillDescriptions: { 'custom-research': { description: '', scenarios: null } } }] }), /scenarios/);
  assert.throws(() => validateCustom({ ...content, equipment: [{ ...content.equipment[0], kind: 'armor' }] }), /kind/);
  assert.throws(() => validateCustom({ ...content, equipment: [{ ...content.equipment[0], skillId: '<script>' }] }), /skillId/);
  assert.throws(() => parseImport(JSON.stringify({ schemaVersion: 1, character: investigator(), custom: content }).replace('"custom-research":{', '"__proto__":{')), /不安全/);
});

test('HTML separates weapons and items, retains modified unarmed records and escapes new text', () => {
  const character = investigator(); character.rulesetId = 'core';
  character.armor = { value: 2, notes: '<script>armor</script>' };
  character.inventory = [
    { id: 'old-unarmed', definitionId: 'unarmed', name: '徒手', quantity: 1, notes: '', damage: '1D3 + DB', range: '接触', attacks: '1' },
    { id: 'custom-unarmed', definitionId: 'unarmed', name: '自定义拳法', quantity: 1, notes: '<img src=x>', damage: '1D6 + DB', range: '接触', attacks: '1' },
    { id: 'knife', definitionId: 'small-knife', name: '测试小刀', quantity: 1, notes: '武器备注', damage: '1D4 + DB' },
    { id: 'book', definitionId: 'notebook', name: '测试笔记本', quantity: 1, notes: '物品备注' },
  ];
  const scoped = structuredClone(RULES);
  scoped.rulesets.find(row => row.id === 'core')!.description = '<script>时代说明</script>';
  const html = characterHTML(character, scoped);
  const weapons = html.split('<h2>武器</h2>')[1].split('<h2>物品</h2>')[0];
  const items = html.split('<h2>物品</h2>')[1].split('<h2>财产与生活水平</h2>')[0];
  assert.equal((weapons.match(/<td>徒手<\/td>/g) ?? []).length, 1);
  assert.match(weapons, /自定义拳法|测试小刀/);
  assert.doesNotMatch(weapons, /测试笔记本/);
  assert.match(items, /测试笔记本/);
  assert.doesNotMatch(items, /测试小刀|自定义拳法/);
  assert.match(html, /<span>护甲<\/span><strong>2<\/strong>/);
  assert.match(html, /&lt;script&gt;armor&lt;\/script&gt;/);
  assert.match(html, /&lt;script&gt;时代说明&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x&gt;/);
  assert.doesNotMatch(html, /<script>|<img src=x>/);
});

test('HTML includes attribute, build and living guidance while money remains manually entered', () => {
  const character = investigator(); character.rulesetId = 'core';
  character.skills['credit-rating'] = { occupation: 30, personal: 0, growth: 0 };
  character.money = { cash: '现金由玩家确认', assets: '资产由玩家确认', spending: '消费由守秘人确认' };
  const html = characterHTML(character, RULES);
  assert.match(html, /体格：[^<]+/);
  assert.match(html, /<p class="guidance">[^<]+<\/p><\/div>/);
  assert.match(html, /普通|平均/);
  for (const value of Object.values(character.money)) assert.ok(html.includes(value));
  assert.match(html, /可用现金不一定随身携带/);
  assert.match(html, /金额由玩家与守秘人记录/);
  assert.doesNotMatch(html, /height:297mm;overflow:hidden/);
});
