import { describe, expect, it } from 'vitest';
import { createCodeGraphyWorkspacePluginTogglePlan } from '../../src';

describe('plugins/workspaceTogglePlan', () => {
  it('enables a plugin with its default options and conservatively analyzes the workspace', () => {
    expect(createCodeGraphyWorkspacePluginTogglePlan([], {
      pluginId: 'codegraphy.godot',
      enabled: true,
      defaultOptions: { includeAutoloads: true },
    })).toEqual({
      plugins: [{
        id: 'codegraphy.godot',
        activation: 'enabled',
        options: { includeAutoloads: true },
      }],
      indexing: { kind: 'analyze-workspace' },
    });
  });

  it.each(['settings-only', 'projection-only'] as const)(
    'uses projection-only work for an enabled plugin with %s toggle impact',
    toggle => {
      expect(createCodeGraphyWorkspacePluginTogglePlan([], {
        pluginId: 'codegraphy.particles',
        enabled: true,
        updateImpact: { toggle },
      }).indexing).toEqual({ kind: 'projection-only' });
    },
  );

  it('targets plugin files when enabling a plugin that owns indexed evidence', () => {
    expect(createCodeGraphyWorkspacePluginTogglePlan([], {
      pluginId: 'codegraphy.vue',
      enabled: true,
      updateImpact: { toggle: 'reanalyze-plugin-files' },
    }).indexing).toEqual({
      kind: 'reprocess-plugin-files',
      pluginIds: ['codegraphy.vue'],
    });
  });

  it('analyzes the workspace for an explicit full-index impact', () => {
    expect(createCodeGraphyWorkspacePluginTogglePlan([], {
      pluginId: 'codegraphy.typescript',
      enabled: true,
      updateImpact: { toggle: 'requires-full-index' },
    }).indexing).toEqual({ kind: 'analyze-workspace' });
  });

  it('disables a plugin with projection-only work regardless of its enable impact', () => {
    expect(createCodeGraphyWorkspacePluginTogglePlan([
      { id: 'codegraphy.vue', activation: 'enabled' },
    ], {
      pluginId: 'codegraphy.vue',
      enabled: false,
      updateImpact: { toggle: 'requires-full-index' },
    })).toEqual({
      plugins: [{ id: 'codegraphy.vue', activation: 'disabled' }],
      indexing: { kind: 'projection-only' },
    });
  });
});
