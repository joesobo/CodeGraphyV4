import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  disableCodeGraphyWorkspacePlugin,
  enableCodeGraphyWorkspacePlugin,
  readCodeGraphyInstalledPluginCache,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyWorkspaceSettings,
} from '../../src';

describe('CodeGraphy installed plugin workspace state', () => {
  it('enables a cached plugin for one workspace without installing or importing it', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));

    enableCodeGraphyWorkspacePlugin(workspaceRoot, {
      package: '@codegraphy-dev/plugin-vue',
      version: '1.2.3',
      apiVersion: '^3.0.0',
      defaultOptions: { includeTests: true },
      disclosures: [],
      packageRoot: '/global/@codegraphy-dev/plugin-vue',
      pluginId: 'codegraphy.vue',
    });

    expect(readCodeGraphyInstalledPluginCache({
      homeDir: path.join(workspaceRoot, 'missing-home'),
    }).plugins).toEqual([]);
    expect(JSON.parse(
      await fs.readFile(path.join(workspaceRoot, '.codegraphy', 'settings.json'), 'utf-8'),
    ).plugins).toEqual([
      { id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, enabled: true },
      {
        id: 'codegraphy.vue',
        enabled: true,
        options: { includeTests: true },
      },
    ]);
  });

  it('merges default options into existing workspace plugin entries and disables by plugin id', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: 'codegraphy.vue',
        enabled: true,
        options: { includeTests: false },
      }],
    });

    enableCodeGraphyWorkspacePlugin(workspaceRoot, {
      package: '@codegraphy-dev/plugin-vue',
      version: '1.2.3',
      apiVersion: '^3.0.0',
      defaultOptions: { includeTests: true, pythonVersion: '3.12' },
      disclosures: [],
      packageRoot: '/global/@codegraphy-dev/plugin-vue',
      pluginId: 'codegraphy.vue',
    });

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([{
      id: 'codegraphy.vue',
      enabled: true,
      options: { includeTests: false, pythonVersion: '3.12' },
    }]);

    disableCodeGraphyWorkspacePlugin(workspaceRoot, 'codegraphy.vue');

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([{
      id: 'codegraphy.vue',
      enabled: false,
      options: { includeTests: false, pythonVersion: '3.12' },
    }]);
  });

  it('omits empty option objects and persists disabled plugin intent', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));

    enableCodeGraphyWorkspacePlugin(workspaceRoot, {
      package: '@codegraphy-dev/plugin-ruby',
      version: '1.2.3',
      apiVersion: '^3.0.0',
      disclosures: [],
      packageRoot: '/global/@codegraphy-dev/plugin-ruby',
      pluginId: 'codegraphy.ruby',
    });

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toContainEqual({
      id: 'codegraphy.ruby',
      enabled: true,
    });

    disableCodeGraphyWorkspacePlugin(workspaceRoot, 'codegraphy.ruby');

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toContainEqual({
      id: 'codegraphy.ruby',
      enabled: false,
    });
  });

  it('does not add empty options when re-enabling a plugin without defaults', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{ id: 'codegraphy.ruby', enabled: false }],
    });

    enableCodeGraphyWorkspacePlugin(workspaceRoot, {
      package: '@codegraphy-dev/plugin-ruby',
      version: '1.2.3',
      apiVersion: '^3.0.0',
      disclosures: [],
      packageRoot: '/global/@codegraphy-dev/plugin-ruby',
      pluginId: 'codegraphy.ruby',
    });

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([{
      id: 'codegraphy.ruby',
      enabled: true,
    }]);
  });

  it('keeps unrelated workspace plugins when disabling one plugin id', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [
        { id: 'codegraphy.vue', enabled: true },
        { id: 'codegraphy.ruby', enabled: true },
      ],
    });

    disableCodeGraphyWorkspacePlugin(workspaceRoot, 'codegraphy.vue');

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([
      { id: 'codegraphy.vue', enabled: false },
      { id: 'codegraphy.ruby', enabled: true },
    ]);
  });
});
