import { describe, expect, it } from 'vitest';
import { createDefaultCodeGraphyWorkspaceSettings } from '../../../src';
import {
  createDisabledPluginSet,
  createPluginActivityState,
} from '../../../src/plugins/activityState/model';

describe('plugins/activityState/model', () => {
  it('keeps duplicate installed package claims inactive with a developer-console warning', () => {
    const state = createPluginActivityState({
      settings: {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        plugins: [{
          id: 'codegraphy.vue',
          enabled: true,
        }],
      },
      installedPlugins: [
        {
          package: '@acme/codegraphy-vue-one',
          version: '1.0.0',
          apiVersion: '^2.0.0',
          disclosures: [],
          packageRoot: '/global/@acme/codegraphy-vue-one',
          pluginId: 'codegraphy.vue',
        },
        {
          package: '@acme/codegraphy-vue-two',
          version: '1.0.0',
          apiVersion: '^2.0.0',
          disclosures: [],
          packageRoot: '/global/@acme/codegraphy-vue-two',
          pluginId: 'codegraphy.vue',
        },
      ],
    });

    expect([...state.activePluginIds]).toEqual([]);
    expect([...state.inactivePluginIds]).toEqual(['codegraphy.vue']);
    expect(state.packagePlugins).toEqual([]);
    expect(state.warnings).toEqual([
      "CodeGraphy plugin 'codegraphy.vue' is enabled but multiple installed packages claim it: @acme/codegraphy-vue-one, @acme/codegraphy-vue-two. No runtime was loaded.",
    ]);
  });

  it('keeps missing enabled plugin ids inactive with a developer-console warning', () => {
    const state = createPluginActivityState({
      settings: {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        plugins: [{
          id: 'codegraphy.vue',
          enabled: true,
        }],
      },
      installedPlugins: [],
    });

    expect([...state.activePluginIds]).toEqual([]);
    expect([...state.inactivePluginIds]).toEqual(['codegraphy.vue']);
    expect(state.packagePlugins).toEqual([]);
    expect(state.warnings).toEqual([
      "CodeGraphy plugin 'codegraphy.vue' is enabled but not installed. No runtime was loaded.",
    ]);
  });

  it('keeps explicitly disabled plugin ids unloaded without warnings', () => {
    const state = createPluginActivityState({
      settings: {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        plugins: [{
          id: 'codegraphy.vue',
          enabled: false,
        }],
      },
      installedPlugins: [{
        package: '@codegraphy-dev/plugin-vue',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        disclosures: [],
        packageRoot: '/global/@codegraphy-dev/plugin-vue',
        pluginId: 'codegraphy.vue',
      }],
    });

    expect([...state.activePluginIds]).toEqual([]);
    expect([...state.disabledPluginIds]).toEqual(['codegraphy.vue']);
    expect(state.packagePlugins).toEqual([]);
    expect(state.warnings).toEqual([]);
  });

  it('combines caller-disabled ids with workspace disabled plugin intent', () => {
    const disabledPlugins = createDisabledPluginSet({
      ...createDefaultCodeGraphyWorkspaceSettings(),
      plugins: [
        { id: 'codegraphy.vue', enabled: false },
        { id: 'codegraphy.vue', enabled: true },
      ],
    }, ['codegraphy.markdown']);

    expect([...disabledPlugins]).toEqual(['codegraphy.markdown', 'codegraphy.vue']);
  });
});
