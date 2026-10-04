import { useLayoutEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { FeedbackForm } from './components/FeedbackForm';
import type { FeedbackDraft } from './lib/feedback';
import './components/feedback.css';

function FeedbackPage() {
  const [initialDraft, setInitialDraft] = useState<FeedbackDraft | null>(null);
  useLayoutEffect(() => {
    const form = document.getElementById('feedback-static-form');
    const message = form instanceof HTMLFormElement ? form.elements.namedItem('message') : null;
    const email = form instanceof HTMLFormElement ? form.elements.namedItem('email') : null;
    setInitialDraft({
      message: message instanceof HTMLTextAreaElement ? message.value : '',
      email: email instanceof HTMLInputElement ? email.value : '',
      includeTechnicalInfo: true,
    });
    form?.setAttribute('hidden', '');
    document.querySelector('.feedback-page-shell')?.classList.add('feedback-page-enhanced');
  }, []);

  if (!initialDraft) return null;
  return <><header><span className="feedback-eyebrow">阿卡姆档案馆 · 反馈 / 吐槽</span><h1>哪里不好用？直接说。</h1><p>问题、勘误、建议，或者一句吐槽都可以。</p></header><FeedbackForm location={{ page: 'feedback' }} initialDraft={initialDraft} /><footer><a href="./index.html">返回档案馆</a></footer></>;
}

const root = document.getElementById('feedback-page-root');
if (root) ReactDOM.createRoot(root).render(<FeedbackPage />);
