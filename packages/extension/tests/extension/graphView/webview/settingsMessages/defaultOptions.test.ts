import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan,
  createCodeGraphyWorkspacePluginTogglePlan,
  writeCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginRecord,
} from '@codegraphy-dev/core';
import {
  readInstalledPluginDefaultOptions,
  readInstalledPluginUpdateImpact,
} from '../../../../../src/extension/graphView/webview/settingsMessages/defaultOptions';

describe('graph view settings plugin defaults', () => {
  it('reads per-descriptor Core metadata and skips Core work for Extension plugins', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-plugin-settings-'));
    const records = [{
      package: '@acme/codegraphy-tools',
      version: '1.0.0',
      packageRoot: '/plugins/acme-tools',
      globallyEnabled: false,
      id: 'codegraphy.vue',
      host: 'core',
      entry: './vue.js',
      apiVersion: '^4.0.0',
      data: {
        defaultOptions: { mode: 'strict' },
        updateImpact: {
          toggle: 'reanalyze-plugin-files',
          defaultSetting: 'reanalyze-plugin-files',
        },
      },
    }, {
      package: '@acme/codegraphy-tools',
      version: '1.0.0',
      packageRoot: '/plugins/acme-tools',
      globallyEnabled: false,
      id: 'codegraphy.particles',
      host: 'codegraphy.extension',
      entry: './particles.js',
      apiVersion: '^1.0.0',
      data: { defaultOptions: { density: 0.5 } },
    }] satisfies CodeGraphyInstalledPluginRecord[];
    writeCodeGraphyInstalledPluginCache({ version: 3, plugins: records }, { homeDir });

    const vueImpact = readInstalledPluginUpdateImpact('codegraphy.vue', { homeDir });
    const particleImpact = readInstalledPluginUpdateImpact('codegraphy.particles', { homeDir });

    expect(readInstalledPluginDefaultOptions('codegraphy.vue', { homeDir })).toEqual({
      mode: 'strict',
    });
    expect(readInstalledPluginDefaultOptions('codegraphy.particles', { homeDir })).toBeUndefined();
    expect(createCodeGraphyWorkspacePluginTogglePlan([], {
      pluginId: 'codegraphy.vue',
      enabled: true,
      updateImpact: vueImpact,
    }).indexing).toEqual({
      kind: 'reprocess-plugin-files',
      pluginIds: ['codegraphy.vue'],
    });
    expect(createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan({
      pluginId: 'codegraphy.vue',
      settingKeys: ['mode'],
      updateImpact: vueImpact,
    })).toEqual({
      kind: 'reprocess-plugin-files',
      pluginIds: ['codegraphy.vue'],
    });
    expect(createCodeGraphyWorkspacePluginTogglePlan([], {
      pluginId: 'codegraphy.particles',
      enabled: true,
      updateImpact: particleImpact,
    }).indexing).toEqual({ kind: 'projection-only' });
  });
});
