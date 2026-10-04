import { useEffect, useId, useRef, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import type { FeedbackLocation } from '../lib/feedback';
import { FeedbackForm } from './FeedbackForm';
import './feedback.css';

export function FeedbackWidget({ location }: { location: FeedbackLocation }) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.getElementById('feedback-fallback')?.setAttribute('hidden', '');
    document.documentElement.dataset.appReady = 'true';
    window.dispatchEvent(new Event('arkham-app-ready'));
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector('textarea')?.focus();
    }
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    setOpen(false);
    launcherRef.current?.focus();
  };

  return <>
    <button ref={launcherRef} type="button" className="feedback-launcher" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-controls={`${id}-dialog`}><MessageSquare size={20} aria-hidden="true" /><span>反馈 / 吐槽</span></button>
    <dialog id={`${id}-dialog`} ref={dialogRef} className="feedback-dialog" aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); close(); }} onClose={() => setOpen(false)} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }}>
      <header className="feedback-dialog-head"><div><span className="feedback-eyebrow">阿卡姆档案馆 · 用户反馈</span><h2 id={`${id}-title`}>哪里不好用？直接说。</h2></div><button type="button" className="feedback-close" aria-label="关闭反馈" onClick={close}><X size={21} aria-hidden="true" /></button></header>
      <FeedbackForm location={location} active={open} autoFocus />
    </dialog>
  </>;
}
