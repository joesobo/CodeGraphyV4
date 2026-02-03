import React from 'react';
import { createRoot } from 'react-dom/client';
// Import vscodeApi FIRST to ensure it acquires the API before any other module
import { getVsCodeApi } from './vscodeApi';
import App from './App';
import './index.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// The API is already acquired in vscodeApi.ts - just get the reference
const vscode = getVsCodeApi();
if (vscode) {
  vscode.postMessage({ type: 'ready' });
}
