import React from 'react';
import { useCallback, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { FeedbackWidget } from './components/FeedbackWidget';
import type { FeedbackLocation } from './lib/feedback';
import './styles.css';

function Workspace() {
  const [location, setLocation] = useState<FeedbackLocation>({ page: 'editor', tab: 'overview' });
  const onCrash = useCallback(() => setLocation({ page: 'unavailable' }), []);
  return <><AppErrorBoundary onCrash={onCrash}><App onFeedbackLocationChange={setLocation} /></AppErrorBoundary><FeedbackWidget location={location} /></>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Workspace /></React.StrictMode>);
