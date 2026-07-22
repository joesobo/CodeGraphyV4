import { describe, expect, it } from 'vitest';
import { createDefaultCodeGraphyWorkspaceSettings } from '../../../src';
import {
  createDisabledPluginSet,
  createPluginActivityState,
} from '../../../src/plugins/activityState/model';

describe('plugins/activityState/model', () => {
  it('combines global defaults with workspace inherit, enabled, and disabled overrides', () => {
    const state = createPluginActivityState({
      settings: {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        plugins: [
          { id: 'codegraphy.vue', activation: 'disabled' },
          { id: 'codegraphy.particles', activation: 'enabled' },
          { id: 'acme.inherited', activation: 'inherit' },
        ],
      },
      installedPlugins: [
        {
          package: '@codegraphy-dev/plugin-vue',
          version: '1.0.0',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
          packageRoot: '/global/@codegraphy-dev/plugin-vue',
          id: 'codegraphy.vue',
          globallyEnabled: true,
        },
        {
          package: '@codegraphy-dev/plugin-particles',
          version: '1.0.0',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
          packageRoot: '/global/@codegraphy-dev/plugin-particles',
          id: 'codegraphy.particles',
          globallyEnabled: false,
        },
        {
          package: '@acme/codegraphy-inherited',
          version: '1.0.0',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
          packageRoot: '/global/@acme/codegraphy-inherited',
          id: 'acme.inherited',
          globallyEnabled: true,
        },
      ],
    });

    expect([...state.activePluginIds]).toEqual([
      'codegraphy.particles',
      'acme.inherited',
    ]);
    expect([...state.disabledPluginIds]).toEqual(['codegraphy.vue']);
    expect(state.packagePlugins.map(plugin => plugin.id)).toEqual([
      'codegraphy.particles',
      'acme.inherited',
    ]);
    expect(state.warnings).toEqual([]);
  });

  it('keeps duplicate installed package claims inactive with a developer-console warning', () => {
    const state = createPluginActivityState({
      settings: {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        plugins: [{
          id: 'codegraphy.vue',
          activation: 'enabled',
        }],
      },
      installedPlugins: [
        {
          package: '@acme/codegraphy-vue-one',
          version: '1.0.0',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
          packageRoot: '/global/@acme/codegraphy-vue-one',
          id: 'codegraphy.vue',
          globallyEnabled: false,
        },
        {
          package: '@acme/codegraphy-vue-two',
          version: '1.0.0',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
          packageRoot: '/global/@acme/codegraphy-vue-two',
          id: 'codegraphy.vue',
          globallyEnabled: false,
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
          activation: 'enabled',
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
          activation: 'disabled',
        }],
      },
      installedPlugins: [{
        package: '@codegraphy-dev/plugin-vue',
        version: '1.0.0',
        host: 'core',
        entry: './plugin.js',
        apiVersion: '^4.0.0',
        packageRoot: '/global/@codegraphy-dev/plugin-vue',
        id: 'codegraphy.vue',
        globallyEnabled: false,
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
        { id: 'codegraphy.vue', activation: 'disabled' },
        { id: 'codegraphy.vue', activation: 'enabled' },
      ],
    }, ['codegraphy.markdown']);

    expect([...disabledPlugins]).toEqual(['codegraphy.markdown', 'codegraphy.vue']);
  });
});
