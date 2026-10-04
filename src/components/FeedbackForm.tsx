import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Copy, Send } from 'lucide-react';
import { buildFeedbackPayload, collectFeedbackTechnicalInfo, FEEDBACK_ENDPOINT, FEEDBACK_MESSAGE_LIMIT, feedbackText, formatFeedbackTechnicalInfo, submitFeedback } from '../lib/feedback';
import type { FeedbackDraft, FeedbackLocation } from '../lib/feedback';
import './feedback.css';

interface FeedbackFormProps {
  location: FeedbackLocation;
  active?: boolean;
  autoFocus?: boolean;
  initialDraft?: FeedbackDraft;
}

const emptyDraft = (): FeedbackDraft => ({ message: '', email: '', includeTechnicalInfo: true });

export function FeedbackForm({ location, active = true, autoFocus = false, initialDraft }: FeedbackFormProps) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const copyRef = useRef<HTMLTextAreaElement>(null);
  const submitting = useRef(false);
  const [draft, setDraft] = useState<FeedbackDraft>(() => initialDraft ?? emptyDraft());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copyText, setCopyText] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [nativeOpened, setNativeOpened] = useState(false);
  const info = useMemo(() => collectFeedbackTechnicalInfo(location), [location.page, location.tab, active]);

  useEffect(() => {
    if (copyText) {
      copyRef.current?.focus();
      copyRef.current?.select();
    }
  }, [copyText]);

  const edit = (patch: Partial<FeedbackDraft>) => {
    setDraft(current => ({ ...current, ...patch }));
    setSuccess(false);
    setCopyText('');
    setCopyStatus('');
    setNativeOpened(false);
  };

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    setSuccess(false);
    setCopyStatus('');
    setNativeOpened(false);
    try {
      const payload = buildFeedbackPayload(draft, info);
      submitting.current = true;
      setSending(true);
      await submitFeedback(payload);
      setDraft(emptyDraft());
      setCopyText('');
      setSuccess(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '反馈暂时无法提交，内容已保留，请稍后重试。');
    } finally {
      submitting.current = false;
      setSending(false);
    }
  };

  const copy = async () => {
    try {
      const text = feedbackText(buildFeedbackPayload(draft, info));
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(text);
        setCopyText('');
        setCopyStatus('反馈文字已复制。');
      } catch {
        setCopyText(text);
        setCopyStatus('请复制下面已选中的文字。');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '请先写下你的反馈。');
    }
  };

  const openNativeSubmit = () => {
    if (submitting.current || nativeOpened || !formRef.current?.reportValidity()) return;
    try {
      buildFeedbackPayload(draft, info);
      // A user-requested normal POST lets the provider display its own verification page.
      formRef.current.submit();
      setNativeOpened(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '请检查反馈内容后重试。');
    }
  };

  return <form ref={formRef} className="feedback-form" action={FEEDBACK_ENDPOINT} method="post" target="_blank" rel="noopener" onSubmit={send}>
    <p className="feedback-privacy">无需登录，反馈会私下发送给维护者，由 Formspree 接收。不会自动附带人物档案、肖像或游戏笔记。</p>
    <label className="feedback-field" htmlFor={`${id}-message`}>
      <span>哪里不好用？<b>必填</b></span>
      <textarea id={`${id}-message`} name="message" required maxLength={FEEDBACK_MESSAGE_LIMIT} rows={5} autoFocus={autoFocus} value={draft.message} disabled={sending} placeholder="问题、勘误、建议，或者一句吐槽都可以。" onChange={event => edit({ message: event.target.value })} aria-describedby={`${id}-draft-note`} />
    </label>
    <p className="feedback-draft-note" id={`${id}-draft-note`}>关闭后重开或提交失败，文字仍会保留在此页面；刷新或离开页面前请先复制。<span>{draft.message.length} / {FEEDBACK_MESSAGE_LIMIT}</span></p>
    <label className="feedback-field" htmlFor={`${id}-email`}>
      <span>邮箱<b>选填</b></span>
      <input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={254} value={draft.email} disabled={sending} placeholder="方便我们追问和回复，不填也能提交" onChange={event => edit({ email: event.target.value })} />
    </label>
    <input type="hidden" name="subject" value="阿卡姆档案馆 · 用户反馈" />
    {draft.includeTechnicalInfo && <input type="hidden" name="technical_info" value={formatFeedbackTechnicalInfo(info)} />}
    <div className="feedback-technical">
      <label className="feedback-checkbox"><input type="checkbox" checked={draft.includeTechnicalInfo} disabled={sending} onChange={event => edit({ includeTechnicalInfo: event.target.checked })} /><span>附带技术信息，方便定位问题</span></label>
      <details>
        <summary>查看技术信息{!draft.includeTechnicalInfo && '（不会发送）'}</summary>
        <pre>{formatFeedbackTechnicalInfo(info)}</pre>
      </details>
    </div>
    {success && <p className="feedback-success" role="status"><Check size={18} aria-hidden="true" />反馈已提交，谢谢你告诉我们。</p>}
    {error && <div className="feedback-error" role="alert"><p>{error}</p><p>文字仍在，你可以重试、复制反馈，或在新的提交页面完成验证。</p><button type="button" className="feedback-alternative" onClick={openNativeSubmit} disabled={sending || nativeOpened}>换一种方式提交<span className="visually-hidden">（新标签页）</span></button>{nativeOpened && <p role="status">已打开新的提交页面，请在那里完成确认；当前文字仍保留。</p>}</div>}
    <div className="feedback-form-actions">
      <button type="button" className="feedback-copy" onClick={copy} disabled={sending || !draft.message.trim()}><Copy size={16} aria-hidden="true" />复制反馈</button>
      <button type="submit" className="feedback-submit" disabled={sending}><Send size={16} aria-hidden="true" />{sending ? '正在提交…' : error ? '重试提交' : '提交反馈'}</button>
    </div>
    {copyStatus && <p className="feedback-copy-status" role="status">{copyStatus}</p>}
    {copyText && <label className="feedback-field"><span>可复制的反馈文字</span><textarea ref={copyRef} readOnly rows={6} value={copyText} onFocus={event => event.currentTarget.select()} /></label>}
  </form>;
}
