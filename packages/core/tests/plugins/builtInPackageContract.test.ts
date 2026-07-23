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
    };

    expect(existsSync(resolve(packageRoot, 'codegraphy.json'))).toBe(false);
    expect(manifest.files ?? []).not.toContain('codegraphy.json');
    expect(manifest.codegraphy?.plugins).toHaveLength(1);
    if (packageName !== 'plugin-particles') {
      expect(manifest.codegraphy?.plugins?.[0]?.data?.supportedExtensions)
        .toEqual(expect.any(Array));
    }
  });

  it.each(PACKAGE_NAMES)('%s uses the shared plugin build command', (packageName) => {
    const packageRoot = resolve(repositoryRoot, 'packages', packageName);
    const manifest = JSON.parse(
      readFileSync(resolve(packageRoot, 'package.json'), 'utf8'),
    ) as {
      scripts?: Record<string, string>;
    };

    expect(manifest.scripts?.build).toBe(
      'node ../../scripts/build-plugin-package.mjs',
    );
  });
});
