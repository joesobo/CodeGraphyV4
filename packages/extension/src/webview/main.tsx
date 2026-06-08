import React from 'react';
import { createRoot } from 'react-dom/client';
import './three/runtime';
import App from './app/view';
import SearchApp from './app/search/view';
import TimelineApp from './app/timeline/view';
import './index.css';
import { getVsCodeApi, VsCodeApi } from './vscodeApi';

const container = document.getElementById('root');
const viewKind = document.body.dataset.codegraphyView;
const RootComponent = viewKind === 'timeline' ? TimelineApp : viewKind === 'search' ? SearchApp : App;
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <RootComponent />
    </React.StrictMode>
  );
}

// Export for use in components that may still access window.vscode
(window as unknown as { vscode: VsCodeApi | null }).vscode = getVsCodeApi();
