import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  disableCodeGraphyWorkspacePlugin,
  enableCodeGraphyWorkspacePlugin,
  inheritCodeGraphyWorkspacePlugin,
  readCodeGraphyWorkspaceSettings,
  updateCodeGraphyWorkspacePluginSelection,
  type CodeGraphyWorkspacePluginSettings,
} from '../../src';

describe('plugins/workspaceSelection', () => {
  it('returns a workspace plugin to its global default without removing its options', () => {
    expect(updateCodeGraphyWorkspacePluginSelection([
      {
        id: 'codegraphy.vue',
        activation: 'disabled',
        options: { includeTests: true },
      },
    ], {
      pluginId: 'codegraphy.vue',
      activation: 'inherit',
    })).toEqual([
      {
        id: 'codegraphy.vue',
        activation: 'inherit',
        options: { includeTests: true },
      },
    ]);
  });

  it('persists disabled plugin id intent in workspace settings', () => {
    const plugins: CodeGraphyWorkspacePluginSettings[] = [
      { id: 'codegraphy.markdown', activation: 'enabled' },
      { id: 'codegraphy.vue', activation: 'enabled', options: { includeTests: true } },
    ];

    expect(
      updateCodeGraphyWorkspacePluginSelection(plugins, {
        pluginId: 'codegraphy.vue',
        activation: 'disabled',
      }),
    ).toEqual([
      { id: 'codegraphy.markdown', activation: 'enabled' },
      { id: 'codegraphy.vue', activation: 'disabled', options: { includeTests: true } },
    ]);
  });

  it('keeps package defaults out of workspace overrides when enabling a plugin', () => {
    const plugins: CodeGraphyWorkspacePluginSettings[] = [
      { id: 'codegraphy.markdown', activation: 'enabled' },
    ];

    expect(
      updateCodeGraphyWorkspacePluginSelection(plugins, {
        pluginId: 'codegraphy.godot',
        activation: 'enabled',
      }),
    ).toEqual([
      { id: 'codegraphy.markdown', activation: 'enabled' },
      { id: 'codegraphy.godot', activation: 'enabled' },
    ]);
  });

  it('keeps existing enabled plugin options unchanged', () => {
    const plugins: CodeGraphyWorkspacePluginSettings[] = [
      { id: 'codegraphy.vue', activation: 'enabled', options: { includeTests: true } },
    ];

    expect(
      updateCodeGraphyWorkspacePluginSelection(plugins, {
        pluginId: 'codegraphy.vue',
        activation: 'enabled',
      }),
    ).toEqual([
      { id: 'codegraphy.vue', activation: 'enabled', options: { includeTests: true } },
    ]);
  });

  it('replaces duplicate plugin entries with one effective selection', () => {
    expect(updateCodeGraphyWorkspacePluginSelection([
      {
        id: 'codegraphy.vue',
        activation: 'disabled',
        options: { mode: 'old' },
      },
      { id: 'codegraphy.markdown', activation: 'enabled' },
      {
        id: 'codegraphy.vue',
        activation: 'enabled',
        options: { mode: 'current' },
      },
    ], {
      pluginId: 'codegraphy.vue',
      activation: 'disabled',
    })).toEqual([
      { id: 'codegraphy.markdown', activation: 'enabled' },
      {
        id: 'codegraphy.vue',
        activation: 'disabled',
        options: { mode: 'current' },
      },
    ]);
  });

  it('does not add an empty options object', () => {
    expect(updateCodeGraphyWorkspacePluginSelection([], {
      pluginId: 'codegraphy.ruby',
      activation: 'enabled',
    })).toEqual([{ id: 'codegraphy.ruby', activation: 'enabled' }]);
  });

  it('persists enabled, disabled, and inherited workspace activation', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-selection-'));
    try {
      enableCodeGraphyWorkspacePlugin(workspaceRoot, {
        package: '@codegraphy-dev/plugin-vue',
        version: '1.2.3',
        host: 'core',
        entry: './plugin.js',
        apiVersion: '^4.0.0',
        packageRoot: '/global/@codegraphy-dev/plugin-vue',
        id: 'codegraphy.vue',
        globallyEnabled: false,
      });
      expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toContainEqual({
        id: 'codegraphy.vue',
        activation: 'enabled',
      });

      disableCodeGraphyWorkspacePlugin(workspaceRoot, 'codegraphy.vue');
      expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toContainEqual({
        id: 'codegraphy.vue',
        activation: 'disabled',
      });

      inheritCodeGraphyWorkspacePlugin(workspaceRoot, 'codegraphy.vue');
      expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toContainEqual({
        id: 'codegraphy.vue',
        activation: 'inherit',
      });
    } finally {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

});
