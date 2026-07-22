import manifest from '../codegraphy.json';
import type { IExtensionPlugin } from '@codegraphy-dev/extension-plugin-api';
import { compileCustomParticleEffects } from './customEffects';

export function createParticlesPlugin(): IExtensionPlugin {
  const webviewContributions = {
    scripts: ['dist/webview.js'],
    assets: [] as Awaited<ReturnType<typeof compileCustomParticleEffects>>,
  };

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    webviewContributions,
    async initialize(workspaceRoot: string) {
      webviewContributions.assets = await compileCustomParticleEffects(workspaceRoot);
    },
  } satisfies IExtensionPlugin;
}

export default createParticlesPlugin;
