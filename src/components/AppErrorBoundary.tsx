import { Component } from 'react';
import type { ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
  onCrash: () => void;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onCrash();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="app-crash"><span className="feedback-eyebrow">阿卡姆档案馆</span><h1>页面遇到了问题</h1><p>你可以通过反馈入口告诉我们发生了什么。刷新页面前，请先复制已经写下的反馈。</p><a className="feedback-submit" href="./feedback.html" target="_blank" rel="noopener">反馈 / 吐槽<span className="visually-hidden">（新标签页）</span></a></main>;
  }
}
