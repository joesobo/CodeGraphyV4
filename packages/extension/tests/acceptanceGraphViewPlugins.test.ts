import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  acceptancePluginPackageRelativePathsForExample,
  writeAcceptanceInstalledPluginCache,
} from './acceptance/graphView/plugins';
import { repoRoot } from './acceptance/graphView/workspace';

describe('acceptance graph view plugin fixtures', () => {
  it('registers the TypeScript plugin for the TypeScript example', () => {
    const pluginRelativePaths = acceptancePluginPackageRelativePathsForExample('example-typescript');
    expect(pluginRelativePaths).toEqual(['packages/plugin-typescript']);

    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cgv-plugin-test-'));
    try {
      writeAcceptanceInstalledPluginCache(homeDir, repoRoot(), pluginRelativePaths);

      const cache = readPluginCache(homeDir);
      expect(cache.plugins).toEqual([
        expect.objectContaining({
          package: '@codegraphy-dev/plugin-typescript',
          packageRoot: path.join(repoRoot(), 'packages/plugin-typescript'),
          id: 'codegraphy.typescript',
          name: 'TypeScript/JavaScript',
          host: 'core',
          supportedExtensions: expect.arrayContaining(['.ts', '.tsx', '.js', '.jsx']),
        }),
      ]);
    } finally {
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });

  it('registers the TypeScript/JavaScript plugin for the JavaScript example', () => {
    expect(acceptancePluginPackageRelativePathsForExample('example-javascript')).toEqual([
      'packages/plugin-typescript',
    ]);
  });

  it('registers the Godot plugin for the Godot example', () => {
    expect(acceptancePluginPackageRelativePathsForExample('example-godot')).toEqual([
      'packages/plugin-godot',
    ]);
  });

  it('registers the Svelte plugin for the Svelte example', () => {
    expect(acceptancePluginPackageRelativePathsForExample('example-svelte')).toEqual([
      'packages/plugin-svelte',
    ]);
  });

  it('does not register package plugins for core-only examples', () => {
    expect(acceptancePluginPackageRelativePathsForExample('example-python')).toEqual([]);
  });
});

function readPluginCache(homeDir: string): { plugins: unknown[] } {
  return JSON.parse(
    fs.readFileSync(path.join(homeDir, '.codegraphy/plugins.json'), 'utf-8'),
  ) as { plugins: unknown[] };
}
