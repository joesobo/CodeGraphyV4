import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './index.css';
import { getVsCodeApi, VsCodeApi } from './vscodeApi';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Export for use in components that may still access window.vscode
(window as unknown as { vscode: VsCodeApi | null }).vscode = getVsCodeApi();
