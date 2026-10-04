import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import type { Occupation, Ruleset, SkillDefinition } from '../types';
import { availableInEra } from '../lib/catalog';
import './guidance.css';

interface OccupationPickerProps {
  occupations: Occupation[];
  skills: SkillDefinition[];
  ruleset?: Ruleset;
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  forNew?: boolean;
}

const ATTRIBUTE_NAMES: Record<string, string> = {
  STR: '力量', CON: '体质', SIZ: '体型', DEX: '敏捷',
  APP: '外貌', INT: '智力', POW: '意志', EDU: '教育',
};

function pointFormula(occupation: Occupation): string {
  const education = `教育（EDU）× ${occupation.formula.edu}`;
  const others = occupation.formula.other ?? [];
  if (!others.length || !occupation.formula.factor) return education;
  const labels = others.map(key => `${ATTRIBUTE_NAMES[key] ?? key}（${key}）`);
  return `${education} ＋ ${labels.join(' / ')}${others.length > 1 ? '中较高者' : ''} × ${occupation.formula.factor}`;
}

export function OccupationPicker({ occupations, skills, ruleset, selectedId, onSelect, onClose, forNew = false }: OccupationPickerProps) {
  const dialogId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [pendingId, setPendingId] = useState(occupations.some(item => item.id === selectedId) ? selectedId : '');
  const [expanded, setExpanded] = useState<string[]>([]);
  const skillsById = useMemo(() => new Map(skills.map(skill => [skill.id, skill])), [skills]);
  const selected = occupations.find(occupation => occupation.id === pendingId);

  const skillName = (id: string) => {
    const alias = ruleset?.skillAliases?.[id];
    return alias ? skillsById.get(alias)?.name ?? alias : skillsById.get(id)?.name ?? id;
  };
  const availableChoice = (id: string) => {
    const skill = skillsById.get(ruleset?.skillAliases?.[id] ?? '') ?? skillsById.get(id);
    return !!skill && (!ruleset || availableInEra(skill.eras, ruleset.id));
  };
  const filtered = occupations.filter(occupation => [
    occupation.name, occupation.english, occupation.description,
    ...occupation.skills.map(skillName),
    ...(occupation.choiceGroups ?? []).flatMap(group => group.options.map(skillName)),
  ].join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    searchRef.current?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return <dialog
    ref={dialogRef}
    role="dialog"
    aria-modal="true"
    aria-labelledby={`${dialogId}-title`}
    aria-describedby={`${dialogId}-description`}
    className="occupation-picker"
    onCancel={event => {
      event.preventDefault();
      onClose();
    }}
    onClick={event => {
      if (event.target === event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }
    }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]'))
        .filter(element => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }}
  >
    <header className="occupation-picker-head">
      <div>
        <div className="eyebrow">OCCUPATION · 职业档案</div>
        <h2 id={`${dialogId}-title`}>选择调查员职业</h2>
        <p id={`${dialogId}-description`}>{forNew ? '从职业简介寻找角色的起点，选定后确认。' : '选定后确认更换；已分配点数会保留，职业可选技能需重新选择。'}</p>
      </div>
      <button type="button" className="icon-button" aria-label="关闭职业选择" onClick={onClose}><X size={21} aria-hidden="true" /></button>
    </header>
    <div className="occupation-picker-toolbar">
      <label className="occupation-search">
        <Search size={17} aria-hidden="true" />
        <span className="visually-hidden">搜索职业名称、简介或技能</span>
        <input ref={searchRef} type="search" value={search} placeholder="搜索职业、简介或擅长的技能" onChange={event => setSearch(event.target.value)} />
      </label>
      <p>{ruleset ? `${ruleset.name} · ${ruleset.era}` : '第 7 版调查员'}<span aria-live="polite">{filtered.length} 个职业</span></p>
    </div>
    <div className="occupation-picker-body">
      <div className="occupation-card-grid" role="radiogroup" aria-label="调查员职业">
        {filtered.map(occupation => {
          const isExpanded = expanded.includes(occupation.id);
          const isSelected = pendingId === occupation.id;
          const detailsId = `${dialogId}-details-${occupation.id}`;
          const choiceGroups = occupation.choiceGroups?.map(group => ({ ...group, options: group.options.filter(availableChoice) }));
          const allSkillIds = [...occupation.skills, ...(choiceGroups ?? []).flatMap(group => group.options)];
          const adaptations = [...new Set(allSkillIds)].filter(id => ruleset?.skillAliases?.[id] && skillName(id) !== (skillsById.get(id)?.name ?? id));
          const era = ruleset?.id.startsWith('custom-') ? 'core' : ruleset?.id;
          const unavailable = [...new Set(allSkillIds)].filter(id => {
            const alias = ruleset?.skillAliases?.[id];
            const skill = skillsById.get(alias ?? '') ?? skillsById.get(id);
            return era && skill?.eras?.length && !skill.eras.includes(era);
          });
          return <article key={occupation.id} className={`occupation-card${isSelected ? ' is-selected' : ''}`} onClick={() => setPendingId(occupation.id)}>
            <label className="occupation-card-select">
              <input type="radio" name={`${dialogId}-occupation`} value={occupation.id} checked={isSelected} onChange={() => setPendingId(occupation.id)} />
              <span><strong>{occupation.name}</strong>{occupation.english && <small>{occupation.english}</small>}</span>
              {isSelected && <Check size={18} className="occupation-selected-mark" aria-hidden="true" />}
            </label>
            <p className="occupation-card-description">{occupation.description || '依据角色经历设定这个职业，并与守秘人确认职业技能。'}</p>
            <p className="occupation-credit">{skillName('credit-rating')}<strong>{occupation.credit[0]}–{occupation.credit[1]}</strong></p>
            <div className="occupation-skill-tags" aria-label="固定职业技能">{occupation.skills.map(id => <span key={id}>{skillName(id)}</span>)}</div>
            <button
              type="button"
              className="occupation-details-button"
              aria-expanded={isExpanded}
              aria-controls={detailsId}
              aria-label={`${isExpanded ? '收起' : '查看'}${occupation.name}的完整要求`}
              onClick={event => {
                event.stopPropagation();
                setExpanded(previous => previous.includes(occupation.id) ? previous.filter(id => id !== occupation.id) : [...previous, occupation.id]);
              }}
            >{isExpanded ? '收起完整要求' : '查看完整要求'}<ChevronDown size={14} aria-hidden="true" /></button>
            {isExpanded && <div className="occupation-card-details" id={detailsId}>
              <p><strong>职业点数</strong>{pointFormula(occupation)}</p>
              {(choiceGroups ?? []).map((group, index) => <p key={`${index}-${group.name}`}><strong>{group.name} · 选 {group.count} 项</strong>{group.options.map(skillName).join('、')}</p>)}
              {(occupation.choiceCount ?? 0) > 0 && <p><strong>额外可选技能</strong>另选 {occupation.choiceCount} 项适合职业或角色经历的技能。</p>}
              {occupation.skillNotes && <p><strong>专长与选择说明</strong>{occupation.skillNotes}</p>}
              {adaptations.length > 0 && <p className="occupation-era-note"><strong>当前时代的技能名称</strong>{adaptations.map(id => `${skillsById.get(id)?.name ?? id} → ${skillName(id)}`).join('；')}</p>}
              {unavailable.length > 0 && <p className="occupation-era-note"><strong>时代适配提示</strong>{unavailable.map(skillName).join('、')}不适用于当前时代，请与守秘人确认替代专长。</p>}
            </div>}
          </article>;
        })}
      </div>
      {filtered.length === 0 && <div className="occupation-no-results">没有符合条件的职业，试试其他关键词。</div>}
    </div>
    <footer className="occupation-picker-actions">
      <p>{selected ? <>待确认：<strong>{selected.name}</strong></> : '请先选择一个职业'}</p>
      <div>
        <button type="button" className="button button-light" onClick={onClose}>取消</button>
        <button type="button" className="button button-primary" disabled={!selected} onClick={() => { if (selected) onSelect(selected.id); }}><Check size={16} aria-hidden="true" />确认职业</button>
      </div>
    </footer>
  </dialog>;
}
