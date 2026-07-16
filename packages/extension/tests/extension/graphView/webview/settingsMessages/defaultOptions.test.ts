import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeCodeGraphyInstalledPluginCache } from '@codegraphy-dev/core';
import {
  readInstalledPluginDefaultOptions,
  readInstalledPluginUpdateImpact,
} from '../../../../../src/extension/graphView/webview/settingsMessages/defaultOptions';

describe('graph view settings plugin default options', () => {
  let homeDir: string;

  beforeEach(() => {
    homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-plugin-defaults-'));
  });

  afterEach(() => {
    fs.rmSync(homeDir, { recursive: true, force: true });
  });

  it('reads plugin default options from the installed plugin cache by Plugin ID', () => {
    writeCodeGraphyInstalledPluginCache(
      {
        version: 1,
        plugins: [
          {
            package: '@codegraphy-dev/plugin-godot',
            pluginId: 'codegraphy.godot',
            version: '2.1.2',
            apiVersion: '^3.0.0',
            disclosures: [],
            packageRoot: '/global/node_modules/@codegraphy-dev/plugin-godot',
            defaultOptions: {
              includeSceneResources: true,
              includeAutoloads: true,
            },
          },
        ],
      },
      { homeDir },
    );

    expect(readInstalledPluginDefaultOptions('codegraphy.godot', { homeDir })).toEqual({
      includeSceneResources: true,
      includeAutoloads: true,
    });
  });

  it('falls back to package name for legacy installed plugin records', () => {
    writeCodeGraphyInstalledPluginCache(
      {
        version: 1,
        plugins: [
          {
            package: '@codegraphy-dev/plugin-godot',
            version: '2.1.2',
            apiVersion: '^3.0.0',
            disclosures: [],
            packageRoot: '/global/node_modules/@codegraphy-dev/plugin-godot',
            defaultOptions: {
              includeSceneResources: true,
            },
          },
        ],
      },
      { homeDir },
    );

    expect(readInstalledPluginDefaultOptions('@codegraphy-dev/plugin-godot', { homeDir })).toEqual({
      includeSceneResources: true,
    });
  });

  it('returns undefined when the installed plugin has no default options', () => {
    writeCodeGraphyInstalledPluginCache(
      {
        version: 1,
        plugins: [
          {
            package: '@codegraphy-dev/plugin-vue',
            pluginId: 'codegraphy.vue',
            version: '2.0.4',
            apiVersion: '^3.0.0',
            disclosures: [],
            packageRoot: '/global/node_modules/@codegraphy-dev/plugin-vue',
          },
        ],
      },
      { homeDir },
    );

    expect(readInstalledPluginDefaultOptions('codegraphy.vue', { homeDir })).toBeUndefined();
  });

  it('reads plugin update impact metadata from the installed plugin cache', () => {
    writeCodeGraphyInstalledPluginCache(
      {
        version: 1,
        plugins: [
          {
            package: '@codegraphy-dev/plugin-particles',
            pluginId: 'codegraphy.particles',
            version: '0.2.1',
            apiVersion: '^3.0.0',
            disclosures: [],
            packageRoot: '/global/node_modules/@codegraphy-dev/plugin-particles',
            updateImpact: {
              toggle: 'projection-only',
              defaultSetting: 'settings-only',
            },
          },
        ],
      },
      { homeDir },
    );

    expect(readInstalledPluginUpdateImpact('codegraphy.particles', { homeDir })).toEqual({
      toggle: 'projection-only',
      defaultSetting: 'settings-only',
    });
  });
});
