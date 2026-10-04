import { useState } from 'react';
import { ArrowUpRight, BookOpen, Search } from 'lucide-react';
import type { RuleData, RuleSource } from '../types';
import { availableInEra, resolveSkillForEra, sourceCoverage } from '../lib/catalog';
import './reference.css';

const SOURCE_KINDS: Record<string, string> = {
  core: '核心资料', setting: '时代与地区', rules: '规则扩展', reference: '专题资料',
  'character-sheet': '官方人物卡', original: '项目原创', 'user-reference': '用户提供参考',
};

export function ReferenceLibrary({ rules }: { rules: RuleData }) {
  const [kind, setKind] = useState<'occupations' | 'skills' | 'equipment' | 'spells' | 'sources'>('occupations');
  const [search, setSearch] = useState('');
  const [era, setEra] = useState('all');
  const profile = rules.rulesets.find(entry => entry.id === era);
  const skillName = (id: string) => {
    const skill = rules.skills.find(entry => entry.id === id);
    return skill ? resolveSkillForEra(skill, rules, profile).name : id;
  };
  const query = search.trim().toLocaleLowerCase();
  const matches = (...values: (string | undefined)[]) => values.join(' ').toLocaleLowerCase().includes(query);
  const sourceLink = (id?: string, verification = false) => {
    const source = rules.sources.find(entry => entry.id === id);
    if (!source) return id === 'original' ? <small>项目原创</small> : id ? <small className="entry-source">旧资料来源：{id}（待补充出处）</small> : null;
    return <small className="entry-source">{verification ? '核实依据' : '来源'}：{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={12} /></a> : source.title}</small>;
  };
  const sourceCard = (source: RuleSource) => <article className="publication-card" key={source.id}>
    <div className="publication-meta"><span>{SOURCE_KINDS[source.kind ?? ''] ?? '核实依据'}</span>
      <span>{[source.publisher, source.year, source.edition].filter(Boolean).join(' · ')}</span></div>
    <h3>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={14} /></a> : source.title}</h3>
    <p>{source.note}</p><small className="publication-coverage">{sourceCoverage(source)}</small>
  </article>;
  const tabs = [
    { id: 'occupations', name: '职业', count: rules.occupations.length },
    { id: 'skills', name: '技能', count: rules.skills.length },
    { id: 'equipment', name: '装备', count: rules.equipment.length },
    { id: 'spells', name: '法术', count: rules.spells.length },
    { id: 'sources', name: '书目与来源', count: rules.sources.length },
  ] as const;
  const content = kind === 'sources' ? [] : rules[kind];
  const entries = content.filter(item => era === 'all' || availableInEra('eras' in item ? item.eras : undefined, era))
    .map(item => 'base' in item ? resolveSkillForEra(item, rules, profile) : item)
    .filter(item => matches(item.name, 'english' in item ? item.english : '', item.description));
  const sources = rules.sources.filter(source => matches(source.title, source.publisher, source.note, source.edition));

  return <>
    <div className="page-heading"><div><div className="eyebrow">THE REFERENCE LIBRARY</div><h1>规则资料库</h1>
      <p>查阅已收录条目、官方书目和各类资料的覆盖范围。</p></div><span className="outlined-badge">COC · 7TH EDITION</span></div>
    <div className="ruleset-grid reference-profiles">{rules.rulesets.map(profile => <article className="paper-panel ruleset-card" key={profile.id}>
      <span className="eyebrow">{profile.english}</span><h2>{profile.name}</h2><span className="rule-badge">{profile.era}</span>
      <p>{profile.description}</p><small>{({ 'official-core': '官方核心规则', 'official-setting-adaptation': '官方设定 · 部分资料适配',
        'official-sheet-adaptation': '官方扩展 · 人物卡适配', 'setting-adaptation': '地区设定适配', 'original-profile': '项目风格选项',
      } as Record<string, string>)[profile.status] ?? profile.status}</small>
      {sourceLink(profile.sourceId)}
    </article>)}</div>
    <section className="paper-panel library-panel">
      <div className="skill-toolbar"><div className="filter-buttons">{tabs.map(tab => <button key={tab.id}
        className={kind === tab.id ? 'active' : ''} onClick={() => { setKind(tab.id); setSearch(''); }}>
        {tab.name} {tab.count}</button>)}</div><label className="search-field"><Search size={16} />
        <input aria-label="搜索规则资料" placeholder={kind === 'sources' ? '搜索书名、出版方或版次…' : '搜索资料…'} value={search} onChange={event => setSearch(event.target.value)} />
      </label></div>
      {kind === 'sources' ? <>
        <p className="catalog-note"><BookOpen size={16} />书目说明出版身份；收录状态分别标示职业、技能与装备。尚未收录的书目暂不提供对应建卡规则。</p>
        <div className="publication-grid">{sources.map(sourceCard)}</div>
        {!sources.length && <div className="empty-small">没有符合条件的书目与来源</div>}
      </> : <>
        <div className="catalog-era"><label>适用时代<select aria-label="筛选资料时代" value={era} onChange={event => setEra(event.target.value)}>
          <option value="all">全部时代</option>{rules.rulesets.map(profile => <option value={profile.id} key={profile.id}>{profile.name}</option>)}
        </select></label><span>{entries.length} 项符合筛选条件</span></div>
        <div className="library-list">{entries.map(item => <article key={item.id}>
          <div><h3>{item.name}</h3><small>{'english' in item ? item.english : 'price' in item ? item.price : ''}</small>
            {'eras' in item && item.eras?.length && <small>{item.eras.map(id => rules.rulesets.find(profile => profile.id === id)?.name ?? id).join(' · ')}</small>}</div>
          <div className="library-entry-body"><p>{item.description}</p>
            {'formula' in item && <><p>职业点：EDU × {item.formula.edu}{item.formula.other ? ` + (${item.formula.other.join(' 或 ')}) × ${item.formula.factor}` : ''}；信用范围：{item.credit.join('–')}</p>
              <p>固定技能：{item.skills.map(skillName).join('、') || '无'}。</p>
              {item.choiceGroups?.map((group, index) => <p key={index}>{group.name}（选 {group.count}）：{group.options.filter(id => {
                const skill = rules.skills.find(entry => entry.id === id);
                return !profile || !!skill && availableInEra(resolveSkillForEra(skill, rules, profile).eras, era);
              }).map(skillName).join('、')}</p>)}
              {!!item.choiceCount && <p>另选 {item.choiceCount} 项符合职业背景的技能。</p>}{item.skillNotes && <small>{item.skillNotes}</small>}
              {item.eraNote && <small>{item.eraNote}</small>}</>}
            {'base' in item && <><p>基础值：{item.base}{typeof item.base === 'number' ? '%' : ''}</p>
              {item.parentId && <small>独立专长 · {skillName(item.parentId)}</small>}</>}
            {'price' in item && <><p>{[item.damage && `伤害 ${item.damage}`, item.range && `射程 ${item.range}`, item.attacks && `每轮攻击 ${item.attacks}`,
              item.ammo && `装弹量 ${item.ammo}`, item.malfunction && `故障值 ${item.malfunction}`, item.armor && `护甲 ${item.armor}`].filter(Boolean).join(' · ')}</p></>}
            {'cost' in item && <small>{item.cost}</small>}{sourceLink(item.sourceId)}
            {'base' in item && profile && (profile.skillBaseOverrides?.[item.id] !== undefined || profile.skillAliases?.[item.id]
              || profile.skillDescriptions?.[item.id]) && <small className="entry-source">时代差异：{profile.name}；核实资料见上方时代说明。</small>}
            {'verificationSourceIds' in item && item.verificationSourceIds?.filter(id => id !== item.sourceId)
              .map(id => <div key={id}>{sourceLink(id, true)}</div>)}
          </div>
        </article>)}</div>{!entries.length && <div className="empty-small">没有符合条件的资料</div>}
      </>}
    </section>
    <p className="catalog-note">预置中文说明由本项目撰写；未核实的职业模板、装备数值和扩展细则需对照对应版次的规则书。</p>
  </>;
}
