import coreData from './core.json';
import gaslightData from './gaslight.json';
import japanData from './japan.json';
import victorianData from './victorian.json';
import darkAgesData from './dark-ages.json';
import westernData from './western.json';
import type { RuleData, RuleGuidance, Ruleset } from '../types';

export interface RulePack {
  version?: string;
  sources?: RuleData['sources'];
  rulesets?: RuleData['rulesets'];
  skills?: RuleData['skills'];
  occupations?: RuleData['occupations'];
  equipment?: RuleData['equipment'];
  spells?: RuleData['spells'];
  guidance?: RuleGuidance;
  extends?: string;
  skillOrder?: string[];
  sourceOrder?: string[];
  dataNotes?: string[];
}

function definitionJSON(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) return item;
    return Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right)));
  });
}

/** Packs can add any catalog. Reusing an ID requires an identical definition. */
export function assembleRulePacks(packs: RulePack[]): RuleData {
  const base = packs[0];
  if (!base?.version) throw new Error('共享规则包必须包含数据版本。');
  const catalog = <Key extends 'sources' | 'rulesets' | 'skills' | 'occupations' | 'equipment' | 'spells'>(key: Key): RuleData[Key] => {
    const definitions = new Map<string, { id: string }>();
    for (const pack of packs) {
      for (const item of pack[key] ?? []) {
        const existing = definitions.get(item.id);
        if (existing && definitionJSON(existing) !== definitionJSON(item)) throw new Error(`规则包 ${key} 标识 ${item.id} 的定义冲突。`);
        if (!existing) definitions.set(item.id, item);
      }
    }
    return [...definitions.values()] as RuleData[Key];
  };
  const rawProfiles = catalog('rulesets');
  const parents = new Map(packs.flatMap(pack => pack.extends ? (pack.rulesets ?? []).map(profile => [profile.id, pack.extends!] as const) : []));
  const resolved = new Map<string, Ruleset>();
  const resolve = (id: string, ancestors = new Set<string>()): Ruleset => {
    const known = resolved.get(id);
    if (known) return known;
    if (ancestors.has(id)) throw new Error(`规则包继承循环：${id}。`);
    const own = rawProfiles.find(profile => profile.id === id);
    if (!own) throw new Error(`规则包引用的继承 profile ${id} 不存在。`);
    const parentId = parents.get(id);
    let profile = own;
    if (parentId) {
      const parent = resolve(parentId, new Set([...ancestors, id]));
      profile = {
        ...parent, ...own,
        skillBaseOverrides: { ...parent.skillBaseOverrides, ...own.skillBaseOverrides },
        skillAliases: { ...parent.skillAliases, ...own.skillAliases },
        skillDescriptions: { ...parent.skillDescriptions, ...own.skillDescriptions },
      };
    }
    resolved.set(id, profile);
    return profile;
  };
  const ordered = <Item extends { id: string }>(items: Item[], ids?: string[]): Item[] => {
    if (!ids) return items;
    const order = new Map(ids.map((id, index) => [id, index]));
    return items.sort((left, right) => (order.get(left.id) ?? Infinity) - (order.get(right.id) ?? Infinity));
  };
  return {
    ...base,
    version: base.version,
    sources: ordered(catalog('sources'), base.sourceOrder),
    rulesets: rawProfiles.map(profile => resolve(profile.id)),
    skills: ordered(catalog('skills'), base.skillOrder),
    occupations: catalog('occupations'),
    equipment: catalog('equipment'),
    spells: catalog('spells'),
  };
}

export const RULES = assembleRulePacks([
  coreData, gaslightData, japanData, victorianData, darkAgesData, westernData,
] as unknown as RulePack[]);
