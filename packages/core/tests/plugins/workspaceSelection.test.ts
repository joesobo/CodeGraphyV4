import { describe, expect, it } from 'vitest';
import {
  createCodeGraphyWorkspacePluginTogglePlan,
  updateCodeGraphyWorkspacePluginSelection,
  type CodeGraphyWorkspacePluginSettings,
} from '../../src';

describe('plugins/workspaceSelection', () => {
  it('persists disabled plugin id intent in workspace settings', () => {
    const plugins: CodeGraphyWorkspacePluginSettings[] = [
      { id: 'codegraphy.markdown', enabled: true },
      { id: 'codegraphy.vue', enabled: true, options: { includeTests: true } },
    ];

    expect(
      updateCodeGraphyWorkspacePluginSelection(plugins, {
        pluginId: 'codegraphy.vue',
        enabled: false,
      }),
    ).toEqual([
      { id: 'codegraphy.markdown', enabled: true },
      { id: 'codegraphy.vue', enabled: false, options: { includeTests: true } },
    ]);
  });

  it('adds enabled plugin ids with default options', () => {
    const plugins: CodeGraphyWorkspacePluginSettings[] = [
      { id: 'codegraphy.markdown', enabled: true },
    ];

    expect(
      updateCodeGraphyWorkspacePluginSelection(plugins, {
        pluginId: 'codegraphy.godot',
        enabled: true,
        defaultOptions: {
          includeAutoloads: true,
          includeSceneResources: true,
        },
      }),
    ).toEqual([
      { id: 'codegraphy.markdown', enabled: true },
      {
        id: 'codegraphy.godot',
        enabled: true,
        options: {
          includeAutoloads: true,
          includeSceneResources: true,
        },
      },
    ]);
  });

  it('keeps existing enabled plugin options unchanged', () => {
    const plugins: CodeGraphyWorkspacePluginSettings[] = [
      { id: 'codegraphy.vue', enabled: true, options: { includeTests: true } },
    ];

    expect(
      updateCodeGraphyWorkspacePluginSelection(plugins, {
        pluginId: 'codegraphy.vue',
        enabled: true,
        defaultOptions: { includeTests: false },
      }),
    ).toEqual([
      { id: 'codegraphy.vue', enabled: true, options: { includeTests: true } },
    ]);
  });

  it('plans a workspace analysis refresh when enabling a plugin id', () => {
    const plan = createCodeGraphyWorkspacePluginTogglePlan([
      { id: 'codegraphy.markdown', enabled: true },
    ], {
      pluginId: 'codegraphy.godot',
      enabled: true,
      defaultOptions: {
        includeAutoloads: true,
      },
    });

    expect(plan).toEqual({
      plugins: [
        { id: 'codegraphy.markdown', enabled: true },
        {
          id: 'codegraphy.godot',
          enabled: true,
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
        { id: 'codegraphy.particles', enabled: true },
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

  it('plans a workspace analysis refresh when disabling a plugin id', () => {
    const plan = createCodeGraphyWorkspacePluginTogglePlan([
      { id: 'codegraphy.markdown', enabled: true },
      { id: 'codegraphy.vue', enabled: true },
    ], {
      pluginId: 'codegraphy.vue',
      enabled: false,
    });

    expect(plan).toEqual({
      plugins: [
        { id: 'codegraphy.markdown', enabled: true },
        { id: 'codegraphy.vue', enabled: false },
      ],
      indexing: {
        kind: 'analyze-workspace',
      },
    });
  });
});
