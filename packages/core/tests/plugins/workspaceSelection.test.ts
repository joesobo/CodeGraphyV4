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
      { id: 'codegraphy.python', enabled: true, options: { includeTests: true } },
    ];

    expect(
      updateCodeGraphyWorkspacePluginSelection(plugins, {
        pluginId: 'codegraphy.python',
        enabled: false,
      }),
    ).toEqual([
      { id: 'codegraphy.markdown', enabled: true },
      { id: 'codegraphy.python', enabled: false, options: { includeTests: true } },
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
      { id: 'codegraphy.python', enabled: true, options: { includeTests: true } },
    ];

    expect(
      updateCodeGraphyWorkspacePluginSelection(plugins, {
        pluginId: 'codegraphy.python',
        enabled: true,
        defaultOptions: { includeTests: false },
      }),
    ).toEqual([
      { id: 'codegraphy.python', enabled: true, options: { includeTests: true } },
    ]);
  });

  it('plans plugin file reprocessing when enabling a plugin id', () => {
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
        kind: 'reprocess-plugin-files',
        pluginIds: ['codegraphy.godot'],
      },
    });
  });

  it('plans a workspace analysis refresh when disabling a plugin id', () => {
    const plan = createCodeGraphyWorkspacePluginTogglePlan([
      { id: 'codegraphy.markdown', enabled: true },
      { id: 'codegraphy.python', enabled: true },
    ], {
      pluginId: 'codegraphy.python',
      enabled: false,
    });

    expect(plan).toEqual({
      plugins: [
        { id: 'codegraphy.markdown', enabled: true },
        { id: 'codegraphy.python', enabled: false },
      ],
      indexing: {
        kind: 'analyze-workspace',
      },
    });
  });
});
