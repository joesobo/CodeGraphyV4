import { describe, expect, it } from 'vitest';
import {
  createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan,
  createCodeGraphyWorkspacePluginTogglePlan,
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

  it('adds enabled plugin ids with default options', () => {
    const plugins: CodeGraphyWorkspacePluginSettings[] = [
      { id: 'codegraphy.markdown', activation: 'enabled' },
    ];

    expect(
      updateCodeGraphyWorkspacePluginSelection(plugins, {
        pluginId: 'codegraphy.godot',
        activation: 'enabled',
        defaultOptions: {
          includeAutoloads: true,
          includeSceneResources: true,
        },
      }),
    ).toEqual([
      { id: 'codegraphy.markdown', activation: 'enabled' },
      {
        id: 'codegraphy.godot',
        activation: 'enabled',
        options: {
          includeAutoloads: true,
          includeSceneResources: true,
        },
      },
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
        defaultOptions: { includeTests: false },
      }),
    ).toEqual([
      { id: 'codegraphy.vue', activation: 'enabled', options: { includeTests: true } },
    ]);
  });

  it('plans a workspace analysis refresh when enabling a plugin id', () => {
    const plan = createCodeGraphyWorkspacePluginTogglePlan([
      { id: 'codegraphy.markdown', activation: 'enabled' },
    ], {
      pluginId: 'codegraphy.godot',
      enabled: true,
      defaultOptions: {
        includeAutoloads: true,
      },
    });

    expect(plan).toEqual({
      plugins: [
        { id: 'codegraphy.markdown', activation: 'enabled' },
        {
          id: 'codegraphy.godot',
          activation: 'enabled',
          options: { includeAutoloads: true },
        },
      ],
      indexing: {
        kind: 'analyze-workspace',
      },
    });
  });

  it('plans projection-only work when plugin metadata says toggles do not affect indexed evidence', () => {
    const plan = createCodeGraphyWorkspacePluginTogglePlan([], {
      pluginId: 'codegraphy.particles',
      enabled: true,
      updateImpact: {
        toggle: 'projection-only',
      },
    });

    expect(plan).toEqual({
      plugins: [
        { id: 'codegraphy.particles', activation: 'enabled' },
      ],
      indexing: {
        kind: 'projection-only',
      },
    });
  });

  it('plans targeted plugin-file analysis when plugin metadata says toggles affect plugin evidence', () => {
    const plan = createCodeGraphyWorkspacePluginTogglePlan([], {
      pluginId: 'codegraphy.vue',
      enabled: true,
      updateImpact: {
        toggle: 'reanalyze-plugin-files',
      },
    });

    expect(plan.indexing).toEqual({
      kind: 'reprocess-plugin-files',
      pluginIds: ['codegraphy.vue'],
    });
  });

  it('plans plugin setting updates from per-key and default impact metadata', () => {
    expect(createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan({
      pluginId: 'codegraphy.particles',
      settingKeys: ['speed', 'size'],
      updateImpact: {
        toggle: 'projection-only',
        defaultSetting: 'settings-only',
      },
    })).toEqual({ kind: 'settings-only' });

    expect(createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan({
      pluginId: 'codegraphy.vue',
      settingKeys: ['includeTests'],
      updateImpact: {
        toggle: 'reanalyze-plugin-files',
        defaultSetting: 'settings-only',
        settings: {
          includeTests: 'reanalyze-plugin-files',
        },
      },
    })).toEqual({
      kind: 'reprocess-plugin-files',
      pluginIds: ['codegraphy.vue'],
    });

    expect(createCodeGraphyWorkspacePluginSettingUpdateIndexingPlan({
      pluginId: 'acme.unknown',
      settingKeys: ['mode'],
      updateImpact: {
        toggle: 'projection-only',
      },
    })).toEqual({ kind: 'analyze-workspace' });
  });

  it('plans projection-only work when disabling a plugin id', () => {
    const plan = createCodeGraphyWorkspacePluginTogglePlan([
      { id: 'codegraphy.markdown', activation: 'enabled' },
      { id: 'codegraphy.vue', activation: 'enabled' },
    ], {
      pluginId: 'codegraphy.vue',
      enabled: false,
    });

    expect(plan).toEqual({
      plugins: [
        { id: 'codegraphy.markdown', activation: 'enabled' },
        { id: 'codegraphy.vue', activation: 'disabled' },
      ],
      indexing: {
        kind: 'projection-only',
      },
    });
  });

  it('keeps enabling plugin evidence conservative until cache hydration or targeted analysis can run', () => {
    const plan = createCodeGraphyWorkspacePluginTogglePlan([], {
      pluginId: 'codegraphy.vue',
      enabled: true,
      updateImpact: {
        toggle: 'reanalyze-plugin-files',
      },
    });

    expect(plan.indexing).toEqual({
      kind: 'reprocess-plugin-files',
      pluginIds: ['codegraphy.vue'],
    });
  });
});
