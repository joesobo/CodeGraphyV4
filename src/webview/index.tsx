import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { getVsCodeApi, postMessage, VsCodeApi } from './lib/vscodeApi';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Notify extension that webview is ready (legacy message)
postMessage({ type: 'WEBVIEW_READY', payload: null } as Parameters<typeof postMessage>[0]);

// Export for use in components that may still access window.vscode
(window as unknown as { vscode: VsCodeApi | null }).vscode = getVsCodeApi();
