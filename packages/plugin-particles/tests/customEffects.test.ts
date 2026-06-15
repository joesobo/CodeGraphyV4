import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileCustomParticleEffects } from '../src/customEffects';
import { createParticlesPlugin } from '../src/plugin';

describe('custom particle effects', () => {
  it('compiles workspace TypeScript custom effects into webview assets during initialize', async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'codegraphy-particles-'));
    const sourceDir = path.join(workspaceRoot, '.codegraphy', 'particles');
    await mkdir(sourceDir, { recursive: true });
    await writeFile(
      path.join(sourceDir, 'fireflies.ts'),
      `
        export function activateParticleEffect({ canvas }) {
          canvas.dataset.customEffect = 'fireflies';
          return () => {
            delete canvas.dataset.customEffect;
          };
        }
      `,
      'utf8',
    );

    const plugin = createParticlesPlugin();
    await plugin.initialize(workspaceRoot);

    expect(plugin.webviewContributions.assets).toEqual([
      {
        id: 'fireflies',
        label: 'Fireflies',
        path: path.join(workspaceRoot, '.codegraphy', 'cache', 'particles', 'fireflies.js'),
        kind: 'particle-effect',
        metadata: {
          sourcePath: '.codegraphy/particles/fireflies.ts',
        },
      },
    ]);
    await expect(readFile(
      path.join(workspaceRoot, '.codegraphy', 'cache', 'particles', 'fireflies.js'),
      'utf8',
    )).resolves.toContain('activateParticleEffect');
  });

  it('returns no custom assets when the workspace has no particle folder', async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'codegraphy-particles-empty-'));

    await expect(compileCustomParticleEffects(workspaceRoot)).resolves.toEqual([]);
  });
});
