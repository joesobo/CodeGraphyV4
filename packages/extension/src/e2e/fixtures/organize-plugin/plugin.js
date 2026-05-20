export default function createPlugin() {
  return {
    id: 'e2e.organize',
    name: 'E2E Organize Plugin',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: [],
    webviewApiVersion: '^1.0.0',
    webviewContributions: {
      scripts: ['webview.js'],
    },
  };
}
