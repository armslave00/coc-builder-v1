import { Plus, Shield, Sparkles, Sword, Trash2, Wallet, X } from 'lucide-react';
import type { Character, InventoryItem, RuleData, Ruleset } from '../types';
import { derive, getSkillTotal } from '../lib/rules';
import { getItems, getWeapons, getWealthGuidance, inventoryKind, weaponSkillId } from '../lib/guidance';
import { NumberField } from './NumberField';

export function EquipmentEditor({ character, rules, ruleset, update }: {
  character: Character;
  rules: RuleData;
  ruleset: Ruleset;
  update: (patch: Partial<Character>) => void;
}) {
  const creditSkill = rules.skills.find(skill => skill.id === 'credit-rating');
  const creditValue = creditSkill ? getSkillTotal(creditSkill, character, ruleset) : 0;
  const wealth = getWealthGuidance(creditValue, rules, ruleset);
  const armor = character.armor ?? { value: 0, notes: '' };
  const stats = derive(character);
  const updateItem = (id: string, patch: Partial<InventoryItem>) => update({
    inventory: character.inventory.map(item => item.id === id ? { ...item, ...patch } : item),
  });
  const skillLabel = (id?: string) => {
    const skill = rules.skills.find(entry => entry.id === id);
    if (!skill) return '由守秘人确认';
    const alias = ruleset.skillAliases?.[skill.id];
    const name = alias ? rules.skills.find(entry => entry.id === alias)?.name || alias : skill.name;
    return `${name} ${getSkillTotal(skill, character, ruleset)}%`;
  };
  const add = (id: string) => {
    const definition = rules.equipment.find(item => item.id === id);
    if (!definition || definition.id === 'unarmed') return;
    update({ inventory: [...character.inventory, {
      id: crypto.randomUUID(), definitionId: definition.id, name: definition.name, quantity: 1, notes: '',
      kind: definition.kind ?? (definition.damage ? 'weapon' : 'item'), skillId: definition.skillId,
      damage: definition.damage, range: definition.range, attacks: definition.attacks,
    }] });
  };
  const picker = (kind: 'weapon' | 'item') => <label className="equipment-picker">
    <Plus size={17} /><select aria-label={kind === 'weapon' ? '添加武器' : '添加物品'} value="" onChange={event => add(event.target.value)}>
      <option value="">{kind === 'weapon' ? '从资料库添加武器…' : '从资料库添加物品…'}</option>
      {rules.equipment.filter(item => item.id !== 'unarmed' && (item.kind ?? (item.damage ? 'weapon' : 'item')) === kind)
        .map(item => <option key={item.id} value={item.id}>{item.name} · {item.price}</option>)}
    </select>
  </label>;
  const row = (item: InventoryItem) => {
    const stored = character.inventory.find(entry => entry.id === item.id);
    const isWeapon = inventoryKind(item, rules) === 'weapon';
    const skillId = weaponSkillId(item, rules);
    return <div key={item.id} className={`inventory-item ${stored ? '' : 'inherent-attack'}`}>
      <div className="inventory-title">
        {isWeapon ? <Sword size={17} /> : <Shield size={17} />}
        {stored ? <input aria-label={`${isWeapon ? '武器' : '物品'}名称`} maxLength={200} value={stored.name}
          onChange={event => updateItem(item.id, { name: event.target.value })} /> : <strong>{item.name}</strong>}
        {stored ? <>
          <NumberField label={`${stored.name}数量`} value={stored.quantity} min={1} max={9999}
            onChange={value => updateItem(item.id, { quantity: value })} />
          <button className="icon-button" aria-label={`移除${stored.name}`} onClick={() => update({
            inventory: character.inventory.filter(entry => entry.id !== item.id),
          })}><Trash2 size={15} /></button>
        </> : <span className="outlined-badge">固有攻击</span>}
      </div>
      {isWeapon && <div className="weapon-stats">
        <span>技能 {skillLabel(skillId)}</span><span>伤害 {item.damage || '待填写'}</span>
        <span>射程 {item.range || '—'}</span><span>攻击 {item.attacks || '—'}</span>
        {item.damage?.includes('DB') && <span>当前伤害加值 {stats.damageBonus}</span>}
      </div>}
      {stored ? <>
        <div className="inventory-category"><label>分类<select aria-label={`${stored.name}分类`} value={isWeapon ? 'weapon' : 'item'}
          onChange={event => updateItem(item.id, { kind: event.target.value as 'weapon' | 'item' })}>
          <option value="weapon">武器</option><option value="item">物品</option>
        </select></label>{item.name !== stored.name && <small>保留的手动攻击记录</small>}</div>
        <input className="inventory-notes" aria-label={`${stored.name}备注`} maxLength={5000} placeholder="备注、弹药或用途…"
          value={stored.notes} onChange={event => updateItem(item.id, { notes: event.target.value })} />
      </> : <p className="inherent-note">每位调查员都可使用；徒手不是携带物品。</p>}
    </div>;
  };
  return <div className="equipment-layout">
    <section className="paper-panel inventory-panel">
      <div className="section-title"><div className="section-name"><Sword size={18} /><h2>武器与徒手</h2><span>WEAPONS</span></div></div>
      {picker('weapon')}<div className="inventory-list">{getWeapons(character, rules).map(row)}</div>
      <div className="equipment-subsection">
        <div className="section-title"><div className="section-name"><Shield size={18} /><h2>携带物品</h2><span>POSSESSIONS</span></div></div>
        {picker('item')}<div className="inventory-list">{getItems(character, rules).map(row)}
          {!getItems(character, rules).length && <div className="empty-small">还没有物品，从上方资料库添加。</div>}
        </div>
      </div>
      <div className="equipment-subsection">
        <div className="section-title"><div className="section-name"><Shield size={18} /><h2>护甲与防护</h2><span>ARMOR</span></div></div>
        <div className="armor-fields"><label className="field"><span>护甲值</span>
          <NumberField label="护甲值" value={armor.value} max={999} onChange={value => update({ armor: { ...armor, value } })} />
        </label><label className="field"><span>防护来源与适用说明</span>
          <textarea aria-label="防护来源与适用说明" value={armor.notes} rows={2} maxLength={5000}
            placeholder="例如：厚皮衣；具体适用伤害与守秘人确认"
            onChange={event => update({ armor: { ...armor, notes: event.target.value } })} />
        </label></div><p className="guidance-note">记录适用的防护值与条件；多件防护的效果由对应规则决定。</p>
      </div>
      <div className="equipment-subsection wealth-section">
        <div className="section-title"><div className="section-name"><Wallet size={18} /><h2>财富与生活</h2><span>WEALTH</span></div></div>
        <div className="wealth-reference"><span className="eyebrow">建卡参考</span>
          <div><strong>{wealth.label}</strong><span>{ruleset.id === 'dark-ages' ? '社会地位' : '信用评级'} {creditValue}%</span></div>
          <p>{wealth.description}</p><small>以下记录由你填写；修改信用评级或时代会保留已记录的财产。</small>
        </div>
        <div className="money-grid">{([
          { key: 'cash', label: '可用现金', help: '可以支用的钱，不一定全在身上。' },
          { key: 'assets', label: '资产', help: '房产、投资等财产，变现需要时间。' },
          { key: 'spending', label: '消费水平', help: '简化日常小额支出的参考额度。' },
        ] as const).map(field => <label className="field" key={field.key}><span>{field.label}</span>
          <input aria-label={field.label} value={character.money[field.key]} maxLength={1000} placeholder="按时代填写金额与币种"
            onChange={event => update({ money: { ...character.money, [field.key]: event.target.value } })} />
          <small>{field.help}</small>
        </label>)}</div>
      </div>
    </section>
    <section className="paper-panel spell-panel">
      <div className="section-title"><div className="section-name"><Sparkles size={18} /><h2>神话法术</h2><span>MYTHOS SPELLS</span></div></div>
      <p className="section-description">新建调查员通常不拥有法术。请与守秘人确认后记录。</p>
      <label className="equipment-picker"><Plus size={17} /><select aria-label="添加法术" value="" onChange={event => {
        if (event.target.value && !character.spellIds.includes(event.target.value)) update({ spellIds: [...character.spellIds, event.target.value] });
      }}><option value="">选择已习得的法术…</option>{rules.spells.filter(spell => !character.spellIds.includes(spell.id))
        .map(spell => <option key={spell.id} value={spell.id}>{spell.name}</option>)}</select></label>
      {character.spellIds.map(id => {
        const spell = rules.spells.find(entry => entry.id === id);
        return <article className="spell-item" key={id}><div><h3>{spell?.name || id}</h3>
          <button className="icon-button" aria-label={`移除${spell?.name || '法术'}`}
            onClick={() => update({ spellIds: character.spellIds.filter(entry => entry !== id) })}><X size={15} /></button>
        </div><p>{spell?.description || '该法术的扩展数据尚未导入。'}</p><small>{spell?.cost}</small></article>;
      })}
      {!character.spellIds.length && <div className="empty-small"><Sparkles size={25} /><p>未知之物，尚未向你低语。</p></div>}
    </section>
  </div>;
}
