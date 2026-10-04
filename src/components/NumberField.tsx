import { useEffect, useState } from 'react';

export function NumberField({ value, onChange, min = 0, max = 99, label, className = '', disabled = false }: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const valueFromDraft = Number(draft);
    const next = Number.isFinite(valueFromDraft) ? Math.max(min, Math.min(max, Math.floor(valueFromDraft))) : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  };
  return <input aria-label={label} type="number" inputMode="numeric" min={min} max={max} disabled={disabled}
    className={className} value={draft} onChange={event => {
      setDraft(event.target.value);
      const next = Number(event.target.value);
      if (event.target.value !== '' && Number.isInteger(next) && next >= min && next <= max) onChange(next);
    }} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} />;
}
