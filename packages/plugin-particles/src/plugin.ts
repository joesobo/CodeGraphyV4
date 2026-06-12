import manifest from '../codegraphy.json';

export function createParticlesPlugin() {
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    webviewApiVersion: '^1.0.0',
    webviewContributions: {
      scripts: ['dist/webview.js'],
    },
  };
}

export default createParticlesPlugin;
