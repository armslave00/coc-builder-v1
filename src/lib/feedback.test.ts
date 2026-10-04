import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildFeedbackPayload, collectFeedbackTechnicalInfo, feedbackText, submitFeedback } from './feedback';

test('submits anonymous feedback only after the service explicitly accepts it', async () => {
  let received: unknown;
  await submitFeedback({ subject: '阿卡姆档案馆 · 用户反馈', message: '导出按钮没有反应' }, {
    fetch: async (_input, init) => {
      received = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ next: '/thanks' }), { status: 200 });
    },
  });
  assert.deepEqual(received, { subject: '阿卡姆档案馆 · 用户反馈', message: '导出按钮没有反应' });
});

test('cancelling technical information sends only the description and optional contact', () => {
  const payload = buildFeedbackPayload({ message: ' 数值不对 ', email: ' player@example.com ', includeTechnicalInfo: false }, {
    version: '1.0.0', page: '调查员技能', browser: 'Test browser', screen: '390 × 844',
    character: { name: '私人角色', notes: '私人笔记' },
  });
  assert.deepEqual(payload, { subject: '阿卡姆档案馆 · 用户反馈', message: '数值不对', email: 'player@example.com' });
});

test('technical preview and submission include only the agreed diagnostic whitelist', () => {
  const payload = buildFeedbackPayload({ message: '导出异常', email: '', includeTechnicalInfo: true }, {
    version: '1.0.0', page: '编辑器 / 装备与法术', browser: 'Test browser', screen: '390 × 844',
    character: { name: '私人角色', notes: '私人笔记' },
  });
  assert.deepEqual(payload, {
    subject: '阿卡姆档案馆 · 用户反馈', message: '导出异常',
    technical_info: '工具版本：1.0.0\n当前功能：编辑器 / 装备与法术\n浏览器：Test browser\n屏幕尺寸：390 × 844',
  });
});

test('rejects empty and oversized descriptions and a malformed optional email', () => {
  const info = { version: '', page: '', browser: '', screen: '' };
  for (const draft of [
    { message: '   ', email: '', includeTechnicalInfo: false },
    { message: 'a'.repeat(5001), email: '', includeTechnicalInfo: false },
    { message: '出错了', email: 'not-an-email', includeTechnicalInfo: false },
  ]) assert.throws(() => buildFeedbackPayload(draft, info), /描述|邮箱/);
});

test('service rejection is never reported as success even with a next link', async () => {
  await assert.rejects(submitFeedback({ subject: '用户反馈', message: '出错了' }, {
    fetch: async () => new Response(JSON.stringify({ next: '/thanks', errors: [{ message: 'Please verify the CAPTCHA' }] }), { status: 200 }),
  }), /验证|未能确认/);
});

test('invalid responses and transport failures retain an actionable submission error', async () => {
  for (const response of [
    new Response('<html>验证码</html>', { status: 200 }),
    new Response('{}', { status: 200 }),
    new Response('{"next":""}', { status: 200 }),
    new Response(null, { status: 204 }),
    new Response(JSON.stringify({ next: '/thanks' }), { status: 429 }),
  ]) await assert.rejects(submitFeedback({ subject: '用户反馈', message: '出错了' }, { fetch: async () => response }), /内容|稍后|结果/);
  await assert.rejects(submitFeedback({ subject: '用户反馈', message: '出错了' }, {
    fetch: async () => { throw new TypeError('Failed to fetch'); },
  }), /网络|内容/);
});

test('submission timeout aborts the request and never silently retries', async () => {
  let attempts = 0;
  let signal: AbortSignal | null | undefined;
  await assert.rejects(submitFeedback({ subject: '用户反馈', message: '出错了' }, {
    timeoutMs: 10,
    fetch: async (_input, init) => {
      attempts++;
      signal = init?.signal;
      return new Promise<Response>(() => {});
    },
  }), /超时|未能确认/);
  assert.equal(signal?.aborted, true);
  assert.equal(attempts, 1);
});

test('diagnostic preview uses recognized feature names and copy excludes unchecked diagnostics', () => {
  const info = collectFeedbackTechnicalInfo({ page: 'editor', tab: 'equipment' });
  assert.equal(info.page, '编辑器 / 装备与法术');
  assert.deepEqual(Object.keys(info).sort(), ['browser', 'page', 'screen', 'version']);
  const payload = buildFeedbackPayload({ message: '导出异常', email: '', includeTechnicalInfo: false }, info);
  assert.equal(feedbackText(payload), '阿卡姆档案馆 · 用户反馈\n\n导出异常');
});
