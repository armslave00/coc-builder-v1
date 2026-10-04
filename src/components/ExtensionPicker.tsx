import { Layers } from 'lucide-react';
import { EXTENSIONS } from '../lib/extensions';

export function ExtensionPicker({ enabledIds, onChange, disabled = false }: {
  enabledIds: readonly string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  return <fieldset className="extension-picker" disabled={disabled}>
    <legend><Layers size={15} aria-hidden="true" />可选扩展包</legend>
    {EXTENSIONS.map(extension => <label className="extension-option" key={extension.id}>
      <input type="checkbox" checked={enabledIds.includes(extension.id)} onChange={event => onChange(event.target.checked
        ? [...enabledIds, extension.id] : enabledIds.filter(id => id !== extension.id))} />
      <span><strong>{extension.name}</strong><small>{extension.description}</small></span>
    </label>)}
    <p>基础通用内容在各时代均可使用；扩展选择随调查员保存，取消勾选会保留已有记录。</p>
  </fieldset>;
}
