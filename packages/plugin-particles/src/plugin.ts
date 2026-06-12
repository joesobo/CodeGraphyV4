import manifest from '../codegraphy.json';
import { compileCustomParticleEffects } from './customEffects';

export function createParticlesPlugin() {
  const webviewContributions = {
    scripts: ['dist/webview.js'],
    assets: [] as Awaited<ReturnType<typeof compileCustomParticleEffects>>,
  };

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    webviewApiVersion: '^1.0.0',
    webviewContributions,
    async initialize(workspaceRoot: string) {
      webviewContributions.assets = await compileCustomParticleEffects(workspaceRoot);
    },
  };
}

export default createParticlesPlugin;
