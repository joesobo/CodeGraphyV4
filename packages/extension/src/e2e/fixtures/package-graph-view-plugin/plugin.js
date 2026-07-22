export default function createPlugin() {
  return {
    id: 'e2e.graph-view-plugin',
    name: 'E2E Graph View Plugin',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    webviewContributions: {
      scripts: ['webview.js'],
    },
  };
}
