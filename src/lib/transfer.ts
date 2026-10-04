import { ATTRIBUTE_KEYS } from '../types';
import type { Attributes, Character, CustomContent, EquipmentDefinition, Occupation, RuleData, Ruleset, SkillAllocation, SkillDefinition, SpellDefinition } from '../types';
import { derive, getSkillTotal } from './rules';
import { getAttributeDescription, getBuildDescription, getItems, getWeapons, getWealthGuidance, weaponSkillId } from './guidance';

export const MAX_IMPORT_BYTES = 12 * 1024 * 1024;
type RecordValue = Record<string, unknown>;
const EMPTY_CUSTOM: CustomContent = { rulesets: [], skills: [], occupations: [], equipment: [], spells: [] };
const BACKSTORY_KEYS = ['appearance', 'ideology', 'people', 'places', 'possessions', 'traits', 'injuries', 'phobias', 'notes'] as const;
const RASTER_DATA = /^data:image\/(?:png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);

function fail(path: string, reason: string): never { throw new Error(`${path}：${reason}`); }
function record(value: unknown, path: string): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, '必须是对象');
  const object = value as RecordValue;
  if (Object.keys(object).some(key => forbiddenKeys.has(key))) fail(path, '含不安全的对象字段');
  return object;
}
function string(value: unknown, path: string, max = 1000): string {
  if (typeof value !== 'string' || value.length > max) fail(path, `必须是长度不超过 ${max} 的文字`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail(path, '文字含无效控制字符');
  return value;
}
function id(value: unknown, path: string): string {
  const text = string(value, path, 100);
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(text) || forbiddenKeys.has(text)) fail(path, '标识只能使用字母、数字、横线、下划线、点和冒号');
  return text;
}
function number(value: unknown, path: string, min = 0, max = 999): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) fail(path, `必须是 ${min}–${max} 的整数`);
  return value;
}
function list(value: unknown, path: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) fail(path, `必须是最多 ${max} 项的数组`);
  return value;
}
function idList(value: unknown, path: string, max = 100): string[] {
  return list(value, path, max).map((item, i) => id(item, `${path}[${i}]`));
}
function optionalString(value: unknown, path: string, max = 1000): string | undefined {
  return value === undefined ? undefined : string(value, path, max);
}
function optionalId(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : id(value, path);
}
function inventoryKind(value: unknown, path: string): 'weapon' | 'item' | undefined {
  if (value === undefined) return undefined;
  if (value !== 'weapon' && value !== 'item') fail(path, '必须是 weapon 或 item');
  return value;
}
function scenarios(value: unknown, path: string): string[] | undefined {
  return value === undefined ? undefined : list(value, path, 8).map((entry, i) => string(entry, `${path}[${i}]`, 300));
}
function eras(value: unknown, path: string): string[] | undefined {
  return value === undefined ? undefined : list(value, path, 20).map((item, i) => string(item, `${path}[${i}]`, 100));
}
function unique<T extends { id: string }>(items: T[], path: string): T[] {
  if (new Set(items.map(item => item.id)).size !== items.length) fail(path, '存在重复标识');
  return items;
}
function portrait(value: unknown, path: string): string {
  const result = string(value, path, 4 * 1024 * 1024);
  if (!result) return '';
  if (RASTER_DATA.test(result)) return result;
  if (/^[a-z][a-z0-9+.-]*:/i.test(result)) {
    if (!/^https?:\/\//i.test(result)) fail(path, '头像仅支持本地图片路径、HTTP(S) 或 PNG/JPEG/GIF/WebP data URI');
    try { const url = new URL(result); if (url.username || url.password) fail(path, '头像 URL 不可包含认证信息'); } catch { fail(path, '头像 URL 无效'); }
    return result;
  }
  if (result.startsWith('//') || result.includes('\\') || /[<>\r\n]/.test(result)) fail(path, '头像路径无效');
  return result;
}

function validateCharacter(value: unknown, path: string): Character {
  const data = record(value, path);
  const sourceAttributes = record(data.attributes, `${path}.attributes`);
  const attributes = Object.fromEntries(ATTRIBUTE_KEYS.map(key => [key, number(sourceAttributes[key], `${path}.attributes.${key}`, 1, 99)])) as Attributes;
  const sourceCurrent = record(data.current, `${path}.current`);
  const currentValue = (key: 'hp' | 'mp' | 'san') => sourceCurrent[key] === null ? null : number(sourceCurrent[key], `${path}.current.${key}`, 0, 99);
  const sourceSkills = record(data.skills, `${path}.skills`);
  if (Object.keys(sourceSkills).length > 600) fail(`${path}.skills`, '技能项目太多');
  const skills: Record<string, SkillAllocation> = Object.create(null);
  for (const [key, value] of Object.entries(sourceSkills)) {
    id(key, `${path}.skills.${key}`);
    const allocation = record(value, `${path}.skills.${key}`);
    skills[key] = {
      occupation: number(allocation.occupation, `${path}.skills.${key}.occupation`),
      personal: number(allocation.personal, `${path}.skills.${key}.personal`),
      growth: number(allocation.growth, `${path}.skills.${key}.growth`),
    };
  }
  const sourceBackstory = record(data.backstory, `${path}.backstory`);
  const backstory = Object.fromEntries(BACKSTORY_KEYS.map(key => [key, string(sourceBackstory[key], `${path}.backstory.${key}`, 20000)])) as Character['backstory'];
  const sourceMoney = record(data.money, `${path}.money`);
  const sourceArmor = data.armor === undefined ? undefined : record(data.armor, `${path}.armor`);
  const armor = sourceArmor ? { value: number(sourceArmor.value, `${path}.armor.value`, 0, 999), notes: string(sourceArmor.notes, `${path}.armor.notes`, 5000) } : { value: 0, notes: '' };
  const inventory = unique(list(data.inventory, `${path}.inventory`, 250).map((item, i) => {
    const itemPath = `${path}.inventory[${i}]`;
    const entry = record(item, itemPath);
    return {
      id: id(entry.id, `${itemPath}.id`), definitionId: id(entry.definitionId, `${itemPath}.definitionId`),
      name: string(entry.name, `${itemPath}.name`, 200), quantity: number(entry.quantity, `${itemPath}.quantity`, 1, 9999),
      notes: string(entry.notes, `${itemPath}.notes`, 5000),
      damage: optionalString(entry.damage, `${itemPath}.damage`, 100), range: optionalString(entry.range, `${itemPath}.range`, 100), attacks: optionalString(entry.attacks, `${itemPath}.attacks`, 100),
      kind: inventoryKind(entry.kind, `${itemPath}.kind`), skillId: optionalId(entry.skillId, `${itemPath}.skillId`),
    };
  }), `${path}.inventory`);
  const createdAt = string(data.createdAt, `${path}.createdAt`, 50);
  const updatedAt = string(data.updatedAt, `${path}.updatedAt`, 50);
  if (!Number.isFinite(Date.parse(createdAt)) || !Number.isFinite(Date.parse(updatedAt))) fail(path, '创建和修改时间必须有效');
  return {
    id: id(data.id, `${path}.id`), name: string(data.name, `${path}.name`, 200), player: string(data.player, `${path}.player`, 200),
    occupationId: id(data.occupationId, `${path}.occupationId`), rulesetId: id(data.rulesetId, `${path}.rulesetId`),
    age: number(data.age, `${path}.age`, 15, 89), gender: string(data.gender, `${path}.gender`, 100),
    birthplace: string(data.birthplace, `${path}.birthplace`), residence: string(data.residence, `${path}.residence`),
    portrait: portrait(data.portrait, `${path}.portrait`), attributes, luck: number(data.luck, `${path}.luck`, 0, 99),
    current: { hp: currentValue('hp'), mp: currentValue('mp'), san: currentValue('san') }, skills,
    occupationChoices: idList(data.occupationChoices, `${path}.occupationChoices`, 64), inventory,
    spellIds: idList(data.spellIds, `${path}.spellIds`, 250), backstory,
    money: { cash: string(sourceMoney.cash, `${path}.money.cash`), assets: string(sourceMoney.assets, `${path}.money.assets`), spending: string(sourceMoney.spending, `${path}.money.spending`) },
    armor, createdAt, updatedAt,
  };
}

export function validateCustom(value: unknown): CustomContent {
  const data = record(value, '原创内容');
  const entries = (key: keyof CustomContent) => list(data[key] ?? [], `原创内容.${key}`, 500);
  const rulesets: Ruleset[] = entries('rulesets').map((value, i) => {
    const path = `原创规则[${i}]`; const row = record(value, path);
    const skillBaseOverrides = row.skillBaseOverrides === undefined ? undefined : Object.fromEntries(Object.entries(record(row.skillBaseOverrides, `${path}.skillBaseOverrides`)).map(([key, value]) => [id(key, `${path}.skillBaseOverrides.${key}`), number(value, `${path}.skillBaseOverrides.${key}`, 0, 99)]));
    const skillAliases = row.skillAliases === undefined ? undefined : Object.fromEntries(Object.entries(record(row.skillAliases, `${path}.skillAliases`)).map(([key, value]) => [id(key, `${path}.skillAliases.${key}`), string(value, `${path}.skillAliases.${key}`, 200)]));
    let skillDescriptions: Ruleset['skillDescriptions'];
    if (row.skillDescriptions !== undefined) {
      const descriptions = record(row.skillDescriptions, `${path}.skillDescriptions`);
      if (Object.keys(descriptions).length > 600) fail(`${path}.skillDescriptions`, '技能说明项目太多');
      skillDescriptions = Object.fromEntries(Object.entries(descriptions).map(([key, value]) => {
        const helpPath = `${path}.skillDescriptions.${key}`;
        const help = record(value, helpPath);
        return [id(key, helpPath), { description: string(help.description, `${helpPath}.description`, 2000), scenarios: list(help.scenarios, `${helpPath}.scenarios`, 8).map((entry, j) => string(entry, `${helpPath}.scenarios[${j}]`, 300)) }];
      }));
    }
    return { id: id(row.id, `${path}.id`), name: string(row.name, `${path}.name`, 200), english: string(row.english, `${path}.english`, 200), era: string(row.era, `${path}.era`, 200), description: string(row.description, `${path}.description`, 5000), sourceId: id(row.sourceId, `${path}.sourceId`), status: string(row.status, `${path}.status`, 200), skillBaseOverrides, skillAliases, skillDescriptions };
  });
  const skills: SkillDefinition[] = entries('skills').map((value, i) => {
    const path = `原创技能[${i}]`; const row = record(value, path);
    const base = row.base === 'DEX/2' || row.base === 'EDU' || row.base === 'APP/5' ? row.base : number(row.base, `${path}.base`, 0, 99);
    return { id: id(row.id, `${path}.id`), name: string(row.name, `${path}.name`, 200), english: string(row.english, `${path}.english`, 200), base, category: string(row.category, `${path}.category`, 200), eras: eras(row.eras, `${path}.eras`), description: optionalString(row.description, `${path}.description`, 2000), scenarios: scenarios(row.scenarios, `${path}.scenarios`) };
  });
  const occupations: Occupation[] = entries('occupations').map((value, i) => {
    const path = `原创职业[${i}]`; const row = record(value, path); const formula = record(row.formula, `${path}.formula`);
    const credit = list(row.credit, `${path}.credit`, 2);
    if (credit.length !== 2) fail(`${path}.credit`, '必须是 [最低信用, 最高信用]');
    const low = number(credit[0], `${path}.credit[0]`, 0, 99); const high = number(credit[1], `${path}.credit[1]`, low, 99);
    const other = formula.other === undefined ? undefined : list(formula.other, `${path}.formula.other`, 8).map((item, j) => {
      const key = string(item, `${path}.formula.other[${j}]`, 3);
      if (!(ATTRIBUTE_KEYS as string[]).includes(key)) fail(`${path}.formula.other`, '必须使用有效属性缩写');
      return key;
    });
    const choiceGroups = row.choiceGroups === undefined ? undefined : list(row.choiceGroups, `${path}.choiceGroups`, 16).map((value, j) => {
      const groupPath = `${path}.choiceGroups[${j}]`; const group = record(value, groupPath);
      const options = idList(group.options, `${groupPath}.options`, 64);
      return { name: string(group.name, `${groupPath}.name`, 200), count: number(group.count, `${groupPath}.count`, 1, options.length), options };
    });
    return { id: id(row.id, `${path}.id`), name: string(row.name, `${path}.name`, 200), english: string(row.english, `${path}.english`, 200), description: string(row.description, `${path}.description`, 5000), formula: { edu: number(formula.edu, `${path}.formula.edu`, 0, 10), other, factor: formula.factor === undefined ? undefined : number(formula.factor, `${path}.formula.factor`, 0, 10) }, credit: [low, high], skills: idList(row.skills, `${path}.skills`, 64), choiceCount: row.choiceCount === undefined ? undefined : number(row.choiceCount, `${path}.choiceCount`, 0, 32), choiceGroups, skillNotes: optionalString(row.skillNotes, `${path}.skillNotes`, 5000), eras: eras(row.eras, `${path}.eras`), sourceId: id(row.sourceId, `${path}.sourceId`) };
  });
  const equipment: EquipmentDefinition[] = entries('equipment').map((value, i) => {
    const path = `原创装备[${i}]`; const row = record(value, path);
    return { id: id(row.id, `${path}.id`), name: string(row.name, `${path}.name`, 200), category: string(row.category, `${path}.category`, 200), description: string(row.description, `${path}.description`, 5000), price: string(row.price, `${path}.price`, 200), damage: optionalString(row.damage, `${path}.damage`, 100), range: optionalString(row.range, `${path}.range`, 100), attacks: optionalString(row.attacks, `${path}.attacks`, 100), kind: inventoryKind(row.kind, `${path}.kind`), skillId: optionalId(row.skillId, `${path}.skillId`), sourceId: id(row.sourceId, `${path}.sourceId`) };
  });
  const spells: SpellDefinition[] = entries('spells').map((value, i) => {
    const path = `原创法术[${i}]`; const row = record(value, path);
    return { id: id(row.id, `${path}.id`), name: string(row.name, `${path}.name`, 200), description: string(row.description, `${path}.description`, 5000), cost: string(row.cost, `${path}.cost`, 500), sourceId: id(row.sourceId, `${path}.sourceId`) };
  });
  return { rulesets: unique(rulesets, '原创规则'), skills: unique(skills, '原创技能'), occupations: unique(occupations, '原创职业'), equipment: unique(equipment, '原创装备'), spells: unique(spells, '原创法术') };
}

export function parseImport(text: string): { characters: Character[]; custom: CustomContent } {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) throw new Error('导入文件不得超过 12 MB');
  let value: unknown;
  try { value = JSON.parse(text, (key, value: unknown) => { if (forbiddenKeys.has(key)) throw new Error('不安全字段'); return value; }); }
  catch { throw new Error('无法读取 JSON：文件格式错误或含不安全字段'); }
  const data = record(value, '导入文件');
  if (data.schemaVersion !== 1) throw new Error('不支持的存档版本，请使用 schemaVersion: 1');
  if (data.character !== undefined && data.characters !== undefined) throw new Error('文件不能同时包含 character 和 characters');
  const sourceCharacters = data.character !== undefined ? [data.character] : list(data.characters, 'characters', 100);
  const emptyArchive = sourceCharacters.length === 0 && data.activeId === '' && data.custom !== undefined;
  if (sourceCharacters.length === 0 && !emptyArchive) throw new Error('存档中没有人物卡；空档案必须包含 activeId: "" 与 custom');
  const characters = unique(sourceCharacters.map((character, i) => validateCharacter(character, `人物卡[${i}]`)), '人物卡');
  if (!emptyArchive && data.activeId !== undefined && !characters.some(character => character.id === id(data.activeId, 'activeId'))) throw new Error('activeId 未指向存档中的人物卡');
  return { characters, custom: data.custom === undefined ? structuredClone(EMPTY_CUSTOM) : validateCustom(data.custom) };
}

export function downloadText(filename: string, content: string, mime = 'application/json;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escape(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
const attributeNames: Record<string, string> = { STR: '力量', CON: '体质', SIZ: '体型', DEX: '敏捷', APP: '外貌', INT: '智力', POW: '意志', EDU: '教育' };
const backstoryNames: Record<typeof BACKSTORY_KEYS[number], string> = { appearance: '形象描述', ideology: '思想与信念', people: '重要之人', places: '意义非凡之地', possessions: '宝贵之物', traits: '特质', injuries: '伤口与疤痕', phobias: '恐惧与狂躁', notes: '调查笔记' };

export function characterHTML(character: Character, rules: RuleData): string {
  const occupation = rules.occupations.find(item => item.id === character.occupationId);
  const ruleset = rules.rulesets.find(item => item.id === character.rulesetId);
  const values = derive(character, occupation);
  const field = (label: string, value: unknown) => `<div class="field"><span>${escape(label)}</span><strong>${escape(value === null || value === undefined || value === '' ? '—' : value)}</strong></div>`;
  const eraId = character.rulesetId.startsWith('custom-') ? 'core' : character.rulesetId;
  const skills = rules.skills.filter(skill => !skill.eras?.length || skill.eras.includes(eraId) || Object.values(character.skills[skill.id] ?? {}).some(n => n > 0)).map(skill => {
    const value = getSkillTotal(skill, character, ruleset);
    const alias = ruleset?.skillAliases?.[skill.id];
    const label = alias ? rules.skills.find(target => target.id === alias)?.name ?? alias : skill.name;
    return `<tr><td>${escape(label)}</td><td>${value}</td><td>${Math.floor(value / 2)}</td><td>${Math.floor(value / 5)}</td></tr>`;
  });
  // Repeat table headings for columns, and preserve all era and custom skills.
  const columnSize = Math.ceil(skills.length / 3);
  const skillTables = Array.from({ length: 3 }, (_, column) => `<table><thead><tr><th>技能</th><th>常规</th><th>½</th><th>⅕</th></tr></thead><tbody>${skills.slice(column * columnSize, (column + 1) * columnSize).join('')}</tbody></table>`).join('');
  const weaponRows = getWeapons(character, rules).map(item => {
    const skill = rules.skills.find(skill => skill.id === weaponSkillId(item, rules));
    const alias = skill ? ruleset?.skillAliases?.[skill.id] : undefined;
    const label = alias ? rules.skills.find(target => target.id === alias)?.name ?? alias : skill?.name;
    const skillText = skill ? `${label} ${getSkillTotal(skill, character, ruleset)}%` : '—';
    return `<tr><td>${escape(item.name)}</td><td>${item.quantity}</td><td>${escape(skillText)}</td><td>${escape(item.damage ?? '—')}</td><td>${escape(item.range ?? '—')}</td><td>${escape(item.attacks ?? '—')}</td><td>${escape(item.notes)}</td></tr>`;
  }).join('');
  const itemRows = getItems(character, rules).map(item => `<tr><td>${escape(item.name)}</td><td>${item.quantity}</td><td>${escape(item.notes)}</td></tr>`).join('');
  const creditSkill = rules.skills.find(skill => skill.id === 'credit-rating');
  const credit = creditSkill ? getSkillTotal(creditSkill, character, ruleset) : 0;
  const wealth = getWealthGuidance(credit, rules, ruleset);
  const armor = character.armor ?? { value: 0, notes: '' };
  const spells = character.spellIds.map(id => {
    const spell = rules.spells.find(item => item.id === id);
    return `<div class="entry"><h3>${escape(spell?.name ?? id)}</h3><p>${escape(spell?.cost ?? '')}</p><p>${escape(spell?.description ?? '当前资料库中无此法术定义。')}</p></div>`;
  }).join('');
  const image = RASTER_DATA.test(character.portrait) ? `<img alt="人物肖像" src="${escape(character.portrait)}">` : '<span>调查员<br>肖像</span>';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(character.name)} · COC 7 调查员档案</title><style>
*{box-sizing:border-box}body{margin:0;background:#e5e2da;color:#202b27;font-family:'Songti SC','Noto Serif CJK SC','SimSun',serif;font-size:10pt;line-height:1.4}.print-note{padding:16px;text-align:center;font-family:system-ui,sans-serif}.page{background:#fffdf6;max-width:210mm;min-height:297mm;margin:16px auto;padding:13mm;box-shadow:0 4px 30px #0002;overflow-wrap:anywhere}header{display:flex;justify-content:space-between;border-bottom:3px double #234238;padding-bottom:5mm;margin-bottom:5mm}header h1{font-size:21pt;margin:0;letter-spacing:2px}header p{margin:2mm 0 0;color:#56635c}.mark{font-size:9pt;letter-spacing:2px;align-self:center;text-align:right}h2{font-size:11pt;letter-spacing:2px;margin:5mm 0 2mm;padding:2mm 3mm;border-top:1px solid #496054;border-bottom:1px solid #496054;background:#e9eee7}h3{font-size:10pt;margin:0 0 1mm}p{white-space:pre-wrap;margin:1mm 0}.identity{display:grid;grid-template-columns:1fr 30mm;gap:5mm}.identity-fields{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm 4mm}.field{border-bottom:1px solid #9aa49c;padding:1mm 0}.field span{display:block;font-size:8pt;color:#5e6d64}.field strong{font-weight:500}.portrait{height:35mm;border:1px solid #8a968c;display:flex;align-items:center;justify-content:center;text-align:center;color:#a1aaa2}.portrait img{max-width:100%;max-height:100%;object-fit:contain}.attributes{display:grid;grid-template-columns:repeat(8,1fr);gap:2mm}.attribute{text-align:center;border:1px solid #9aa49c;padding:2mm 0}.attribute span,.attribute small{display:block;font-size:8pt}.attribute strong{font-size:14pt}.attribute .guidance{font-size:7pt;padding:1mm;line-height:1.5}.guidance{color:#53645a;font-size:8pt}.armor{margin:3mm 0}.derived{display:grid;grid-template-columns:repeat(6,1fr);gap:2mm}.derived .field{text-align:center}.skill-columns{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}table{width:100%;border-collapse:collapse;font-size:8pt}th{background:#e9eee7;font-weight:500}td,th{padding:1.1mm;border-bottom:1px solid #c9cec6;text-align:left}td:nth-child(n+2),th:nth-child(n+2){text-align:right}.backstories{display:grid;grid-template-columns:1fr 1fr;gap:3mm}.entry{border:1px solid #b4bcb2;padding:3mm;break-inside:avoid;min-height:15mm}.wide{grid-column:1/-1}footer{margin-top:5mm;font-size:8pt;color:#667369;border-top:1px solid #b4bcb2;padding-top:2mm}.money{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}.equipment{font-size:8pt}.equipment td:last-child{text-align:left}tr{break-inside:avoid}
@media(max-width:650px){.page{margin:0;min-height:auto;padding:20px}.identity-fields{grid-template-columns:repeat(2,1fr)}.attributes{grid-template-columns:repeat(4,1fr)}.derived{grid-template-columns:repeat(3,1fr)}.skill-columns{grid-template-columns:1fr}.backstories{grid-template-columns:1fr}.wide{grid-column:auto}.mark{display:none}.equipment{font-size:7pt}}
@page{size:A4;margin:0}@media print{body{background:white}.print-note{display:none}.page{margin:0;box-shadow:none;width:210mm;max-width:none;min-height:297mm;padding:13mm;break-after:page}.page:last-child{break-after:auto}.identity-fields{grid-template-columns:repeat(3,1fr)}.attributes{grid-template-columns:repeat(8,1fr)}.derived{grid-template-columns:repeat(6,1fr)}.skill-columns{grid-template-columns:repeat(3,1fr)}.backstories{grid-template-columns:1fr 1fr}.wide{grid-column:1/-1}.mark{display:block}thead{display:table-header-group}h2{break-after:avoid}}
</style></head><body><div class="print-note">使用浏览器打印（Ctrl / ⌘ + P）保存为 PDF · 选择 A4 纸张，关闭页眉页脚</div><main>
<section class="page"><header><div><h1>调查员档案</h1><p>CALL OF CTHULHU · 7TH EDITION</p></div><div class="mark">ARKHAM ARCHIVE<br>第一面 · 属性与技能</div></header><div class="identity"><div class="identity-fields">${field('调查员', character.name)}${field('玩家', character.player)}${field('职业', occupation?.name ?? character.occupationId)}${field('年龄 / 性别', `${character.age} / ${character.gender || '—'}`)}${field('出生地', character.birthplace)}${field('居住地', character.residence)}${field('规则 / 时代', ruleset?.name ?? character.rulesetId)}</div><div class="portrait">${image}</div></div><p class="guidance">${escape(ruleset?.description ?? '')}</p>
<h2>属性 · 常规 / 困难 / 极难</h2><div class="attributes">${ATTRIBUTE_KEYS.map(key => `<div class="attribute"><span>${attributeNames[key]} ${key}</span><strong>${character.attributes[key]}</strong><small>${Math.floor(character.attributes[key] / 2)} / ${Math.floor(character.attributes[key] / 5)}</small><p class="guidance">${escape(getAttributeDescription(key, character.attributes[key], rules))}</p></div>`).join('')}</div>
<h2>状态与衍生数值</h2><div class="derived">${field('生命 HP 当前 / 最大', `${character.current.hp ?? values.hp} / ${values.hp}`)}${field('魔法 MP 当前 / 最大', `${character.current.mp ?? values.mp} / ${values.mp}`)}${field('理智 SAN 当前 / 上限', `${character.current.san ?? values.san} / ${values.maxSan}`)}${field('幸运 LUCK', character.luck)}${field('移动 MOV', values.move)}${field('体格 / 伤害加值', `${values.build} / ${values.damageBonus}`)}</div><p class="guidance">体格：${escape(getBuildDescription(values.build, rules))}</p><div class="armor">${field('护甲', armor.value)}<p>${escape(armor.notes || '未记录防护说明')}</p></div>
<h2>调查员技能</h2><div class="skill-columns">${skillTables}</div><footer>职业点数 ${values.occupationSpent} / ${values.occupationPoints} · 兴趣点数 ${values.personalSpent} / ${values.personalPoints} · 半值与五分之一均向下取整。此为个人使用的非官方人物卡。</footer></section>
<section class="page"><header><div><h1>${escape(character.name || '未命名调查员')}</h1><p>PERSONAL HISTORY & FIELD NOTES</p></div><div class="mark">ARKHAM ARCHIVE<br>第二面 · 背景与装备</div></header><h2>武器</h2><table class="equipment"><thead><tr><th>武器</th><th>数量</th><th>使用技能</th><th>伤害</th><th>射程</th><th>攻击次数</th><th>备注</th></tr></thead><tbody>${weaponRows}</tbody></table><h2>物品</h2><table class="equipment"><thead><tr><th>物品</th><th>数量</th><th>备注</th></tr></thead><tbody>${itemRows || '<tr><td colspan="3">未记录物品</td></tr>'}</tbody></table><h2>财产与生活水平</h2><p><strong>${escape(wealth.label)}</strong> · ${escape(wealth.description)}</p><div class="money">${field('可用现金', character.money.cash)}${field('资产', character.money.assets)}${field('消费水平', character.money.spending)}</div><p class="guidance">金额由玩家与守秘人记录。可用现金不一定随身携带；资产需变现才能支用；消费水平用于简化小额支出的记账。</p><h2>背景故事</h2><div class="backstories">${BACKSTORY_KEYS.map(key => `<div class="entry${key === 'notes' ? ' wide' : ''}"><h3>${backstoryNames[key]}</h3><p>${escape(character.backstory[key] || '—')}</p></div>`).join('')}</div><h2>法术与神秘知识</h2>${spells || '<p>未记录法术</p>'}<footer>档案编号：${escape(character.id)} · 修改时间：${escape(character.updatedAt)}<br>规则资料版本：${escape(rules.version)}。技能、装备与法术以所选规则书及守秘人的裁定为准。</footer></section></main></body></html>`;
}
