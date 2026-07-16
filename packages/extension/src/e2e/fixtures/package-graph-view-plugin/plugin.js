export default function createPlugin() {
  return {
    id: 'e2e.graph-view-plugin',
    name: 'E2E Graph View Plugin',
    version: '1.0.0',
    apiVersion: '^3.0.0',
    supportedExtensions: [],
    webviewApiVersion: '^1.0.0',
    webviewContributions: {
      scripts: ['webview.js'],
    },
  };
}
