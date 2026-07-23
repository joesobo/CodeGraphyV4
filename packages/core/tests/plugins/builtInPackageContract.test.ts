import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const PACKAGE_NAMES: readonly string[] = [
  'plugin-markdown',
  'plugin-typescript',
  'plugin-svelte',
  'plugin-vue',
  'plugin-godot',
  'plugin-unity',
  'plugin-particles',
];

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);

describe('built-in plugin package contract', () => {
  it('keeps plugin builds inside their owning packages', () => {
    expect(existsSync(resolve(repositoryRoot, 'scripts/build-plugin-package.mjs'))).toBe(false);
  });

  it.each(PACKAGE_NAMES)('%s uses package.json as its only plugin manifest', (packageName) => {
    const packageRoot = resolve(repositoryRoot, 'packages', packageName);
    const manifest = JSON.parse(
      readFileSync(resolve(packageRoot, 'package.json'), 'utf8'),
    ) as {
      codegraphy?: {
        plugins?: Array<{
          data?: {
            supportedExtensions?: unknown;
          };
        }>;
      };
      files?: string[];
      codegraphyBuild?: unknown;
    };

    expect(existsSync(resolve(packageRoot, 'codegraphy.json'))).toBe(false);
    expect(manifest.files ?? []).not.toContain('codegraphy.json');
    expect(manifest.codegraphy?.plugins).toHaveLength(packageName === 'plugin-unity' ? 2 : 1);
    expect(manifest.codegraphyBuild).toBeUndefined();
    if (packageName !== 'plugin-particles') {
      expect(manifest.codegraphy?.plugins?.[0]?.data?.supportedExtensions)
        .toEqual(expect.any(Array));
    }
  });

  it.each(PACKAGE_NAMES)('%s owns one self-contained build command', (packageName) => {
    const packageRoot = resolve(repositoryRoot, 'packages', packageName);
    const manifest = JSON.parse(
      readFileSync(resolve(packageRoot, 'package.json'), 'utf8'),
    ) as {
      scripts?: Record<string, string>;
    };

    expect(manifest.scripts?.build).toEqual(expect.any(String));
    expect(manifest.scripts?.build).not.toContain('../../scripts');
    expect(manifest.scripts).not.toHaveProperty('build:types');
    expect(manifest.scripts).not.toHaveProperty('build:runtime');
  });

  it('declares Unity Core analysis and Extension styling as separate plugins', () => {
    const packageManifest = JSON.parse(
      readFileSync(resolve(repositoryRoot, 'packages/plugin-unity/package.json'), 'utf8'),
    ) as {
      codegraphy: {
        plugins: Array<{
          data?: Record<string, unknown>;
          host: string;
        }>;
      };
    };

    expect(packageManifest.codegraphy.plugins.map(plugin => plugin.host)).toEqual([
      'core',
      'codegraphy.extension',
    ]);
    expect(packageManifest.codegraphy.plugins[0]?.data).not.toHaveProperty('interfaces');
    expect(packageManifest.codegraphy.plugins[1]?.data).toHaveProperty('fileColors');
  });

  it('does not keep a detached Extension metadata schema', () => {
    expect(existsSync(resolve(repositoryRoot, 'codegraphy.extension.schema.json'))).toBe(false);
  });
});
