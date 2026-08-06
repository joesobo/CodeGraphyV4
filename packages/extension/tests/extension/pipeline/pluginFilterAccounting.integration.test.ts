import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { FileDiscovery, parseCodeGraphyPluginPackageManifest } from '@codegraphy-dev/core';
import { getWorkspacePipelinePluginFilterPatterns } from '../../../src/extension/pipeline/plugins/bootstrap/filters';
import { unknownRecordSchema } from '../../../src/shared/values';

interface FilterPluginInfo {
  plugin: {
    id: string;
    name: string;
    defaultFilters: string[];
  };
}

const tempDirectories: string[] = [];

function createMixedWorkspace(): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-filter-accounting-'));
  tempDirectories.push(workspaceRoot);
  execFileSync('git', ['init', '-q'], { cwd: workspaceRoot });

  const files: Record<string, string> = {
    '.gitignore': 'ignored/**\n',
    'src/app.ts': 'export const app = true;\n',
    '.next/app.js': 'export const app = true;\n',
    'scripts/player.gd': 'extends Node\n',
    'scripts/player.gd.uid': 'uid://player\n',
    'Assets/Player.prefab': '%YAML 1.1\n',
    'Assets/Player.prefab.meta': 'guid: player\n',
    'ignored/ignored.meta': 'guid: ignored\n',
  };

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(workspaceRoot, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }

  return workspaceRoot;
}

function readCorePlugin(packageName: string): FilterPluginInfo {
  const packageJsonPath = path.resolve(__dirname, `../../../../${packageName}/package.json`);
  const manifest = parseCodeGraphyPluginPackageManifest(
    JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')),
  );
  if (!manifest) throw new Error(`Invalid plugin package: ${packageName}`);
  const descriptor = manifest.plugins.find(plugin => plugin.host === 'core');
  if (!descriptor) throw new Error(`Core plugin descriptor not found: ${packageName}`);
  const metadata = unknownRecordSchema.parse(descriptor.data);
  const defaultFilters = z.array(z.string()).parse(metadata.defaultFilters);
  if (!descriptor.id) throw new Error(`Core plugin ID not found: ${packageName}`);
  if (!descriptor.name) throw new Error(`Core plugin name not found: ${packageName}`);

  return {
    plugin: {
      id: descriptor.id,
      name: descriptor.name,
      defaultFilters,
    },
  };
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('plugin Filter accounting', () => {
  it('tracks shipped TypeScript, Godot, and Unity defaults as plugins become active', async () => {
    const workspaceRoot = createMixedWorkspace();
    const plugins = [
      readCorePlugin('plugin-typescript'),
      readCorePlugin('plugin-godot'),
      readCorePlugin('plugin-unity'),
    ];
    const source = { list: () => plugins };
    const discovery = new FileDiscovery();

    const typescriptOnly = await discovery.discover({
      rootPath: workspaceRoot,
      filter: getWorkspacePipelinePluginFilterPatterns(
        source,
        new Set(['codegraphy.gdscript', 'codegraphy.unity']),
      ),
    });
    expect(typescriptOnly.filterAccounting).toEqual({
      kind: 'current',
      excludedFileCount: 1,
      gitIgnoredPathCount: 2,
    });

    const allPlugins = await discovery.discover({
      rootPath: workspaceRoot,
      filter: getWorkspacePipelinePluginFilterPatterns(source),
    });
    expect(allPlugins.filterAccounting).toEqual({
      kind: 'current',
      excludedFileCount: 3,
      gitIgnoredPathCount: 2,
    });
    expect(allPlugins.files.map(file => file.relativePath)).toEqual(expect.arrayContaining([
      'Assets/Player.prefab',
      'scripts/player.gd',
      'src/app.ts',
    ]));
    expect(allPlugins.gitIgnoredPaths).toContain('ignored');
  });
});
