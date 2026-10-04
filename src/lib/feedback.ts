import metadata from '../../package.json';

export const FEEDBACK_ENDPOINT = 'https://formspree.io/f/xgaowdoa';
export const FEEDBACK_MESSAGE_LIMIT = 5000;

export interface FeedbackLocation {
  page: 'editor' | 'rules' | 'custom' | 'feedback' | 'unavailable';
  tab?: 'overview' | 'skills' | 'background' | 'equipment';
}

export interface FeedbackDraft {
  message: string;
  email: string;
  includeTechnicalInfo: boolean;
}

export interface FeedbackTechnicalInfo {
  version: string;
  page: string;
  browser: string;
  screen: string;
}

export interface FeedbackPayload {
  subject: string;
  message: string;
  email?: string;
  technical_info?: string;
}

interface SubmitFeedbackOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export function buildFeedbackPayload(draft: FeedbackDraft, info: FeedbackTechnicalInfo): FeedbackPayload {
  const payload: FeedbackPayload = { subject: '阿卡姆档案馆 · 用户反馈', message: draft.message.trim() };
  if (!payload.message || payload.message.length > FEEDBACK_MESSAGE_LIMIT) throw new Error(`请填写 1–${FEEDBACK_MESSAGE_LIMIT} 字的问题描述。`);
  const email = draft.email.trim();
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(email))) throw new Error('请填写有效邮箱，或留空匿名提交。');
  if (email) payload.email = email;
  if (draft.includeTechnicalInfo) {
    payload.technical_info = formatFeedbackTechnicalInfo(info);
  }
  return payload;
}

export function formatFeedbackTechnicalInfo(info: FeedbackTechnicalInfo): string {
  return `工具版本：${info.version}\n当前功能：${info.page}\n浏览器：${info.browser}\n屏幕尺寸：${info.screen}`;
}

export function collectFeedbackTechnicalInfo(location: FeedbackLocation): FeedbackTechnicalInfo {
  const pages = { editor: '编辑器', rules: '规则资料库', custom: '原创扩展工坊', feedback: '独立反馈页', unavailable: '应用暂时无法显示' };
  const tabs = { overview: '基础档案', skills: '调查员技能', background: '背景故事', equipment: '装备与法术' };
  const page = pages[location.page] ?? '未知功能';
  return {
    version: metadata.version,
    page: location.page === 'editor' ? `${page} / ${tabs[location.tab ?? 'overview'] ?? '未知功能'}` : page,
    browser: typeof navigator === 'undefined' ? '未知' : navigator.userAgent.slice(0, 500),
    screen: typeof window === 'undefined' ? '未知' : `${window.innerWidth} × ${window.innerHeight}（视口）`,
  };
}

export function feedbackText(payload: FeedbackPayload): string {
  return [payload.subject, payload.message, payload.email ? `回复邮箱：${payload.email}` : '', payload.technical_info ?? ''].filter(Boolean).join('\n\n');
}

export async function submitFeedback(payload: FeedbackPayload, options: SubmitFeedbackOptions = {}): Promise<void> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error('提交超时，未能确认结果。内容已保留，可稍后重试或复制反馈。'));
      controller.abort();
    }, options.timeoutMs ?? 20000);
  });
  const request = async () => {
    const response = await (options.fetch ?? fetch)(FEEDBACK_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit',
      signal: controller.signal,
    }).catch(() => { throw new Error('网络连接失败，内容已保留。请稍后重试或复制反馈。'); });
    if (response.status === 429) throw new Error('提交过于频繁，请保留内容并稍后重试。');
    const result: unknown = await response.json().catch(() => { throw new Error('未能确认提交结果，请保留内容，或换一种方式提交。'); });
    if (result && typeof result === 'object' && ('error' in result || ('errors' in result && Array.isArray(result.errors) && result.errors.length > 0))) {
      throw new Error('反馈服务未能接收内容，可能需要验证。请保留内容重试，或换一种方式提交。');
    }
    if (!response.ok || !result || typeof result !== 'object' || !('next' in result) || typeof result.next !== 'string' || !result.next.trim()) {
      throw new Error('未能确认提交结果，请保留内容并稍后重试。');
    }
  };
  try {
    await Promise.race([request(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
