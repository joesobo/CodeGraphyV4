import { describe, expect, it } from 'vitest';
import { createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan } from '../../src';

describe('plugins/workspaceSettingPlan', () => {
  it('uses the default setting impact for known and empty setting lists', () => {
    const options = {
      pluginId: 'codegraphy.particles',
      updateImpact: {
        toggle: 'projection-only' as const,
        defaultSetting: 'settings-only' as const,
      },
    };
    expect(createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan({
      ...options,
      settingKeys: ['speed'],
    })).toEqual({ kind: 'settings-only' });
    expect(createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan({
      ...options,
      settingKeys: [],
    })).toEqual({ kind: 'settings-only' });
  });

  it('uses a per-setting impact before the default', () => {
    expect(createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan({
      pluginId: 'codegraphy.vue',
      settingKeys: ['includeTests'],
      updateImpact: {
        toggle: 'reanalyze-plugin-files',
        defaultSetting: 'settings-only',
        settings: { includeTests: 'reanalyze-plugin-files' },
      },
    })).toEqual({
      kind: 'reprocess-plugin-files',
      pluginIds: ['codegraphy.vue'],
    });
  });

  it.each([
    ['projection-only', { kind: 'projection-only' }],
    ['requires-full-index', { kind: 'analyze-workspace' }],
  ] as const)('maps %s to its indexing plan', (defaultSetting, expected) => {
    expect(createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan({
      pluginId: 'codegraphy.test',
      settingKeys: ['mode'],
      updateImpact: { toggle: 'projection-only', defaultSetting },
    })).toEqual(expected);
  });

  it('uses the highest impact when several settings change', () => {
    expect(createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan({
      pluginId: 'codegraphy.test',
      settingKeys: ['display', 'files', 'mode'],
      updateImpact: {
        toggle: 'requires-full-index',
        defaultSetting: 'settings-only',
        settings: {
          display: 'projection-only',
          files: 'reanalyze-plugin-files',
          mode: 'requires-full-index',
        },
      },
    })).toEqual({ kind: 'analyze-workspace' });
  });

  it('defaults to a full workspace analysis when impact metadata is missing', () => {
    expect(createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan({
      pluginId: 'acme.unknown',
      settingKeys: ['mode'],
    })).toEqual({ kind: 'analyze-workspace' });
    expect(createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan({
      pluginId: 'acme.unknown',
      settingKeys: [],
    })).toEqual({ kind: 'analyze-workspace' });
  });
});
