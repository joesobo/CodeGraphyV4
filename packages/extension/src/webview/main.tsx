import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/view';
import './index.css';
import { getVsCodeApi, VsCodeApi } from './vscodeApi';
import { prepareGraphPhysics } from '@codegraphy-dev/graph-renderer';

const container = document.getElementById('root');
if (container) {
  const graphPhysicsPreparation = prepareGraphPhysics();
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App graphPhysicsPreparation={graphPhysicsPreparation} />
    </React.StrictMode>
  );
}

// Export for use in components that may still access window.vscode.
(window as unknown as { vscode: VsCodeApi | null }).vscode = getVsCodeApi();
