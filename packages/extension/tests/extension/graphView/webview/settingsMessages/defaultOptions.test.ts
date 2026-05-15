import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeCodeGraphyInstalledPluginCache } from '@codegraphy/core';
import { readInstalledPluginDefaultOptions } from '../../../../../src/extension/graphView/webview/settingsMessages/defaultOptions';

describe('graph view settings plugin default options', () => {
  let homeDir: string;

  beforeEach(() => {
    homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-plugin-defaults-'));
  });

  afterEach(() => {
    fs.rmSync(homeDir, { recursive: true, force: true });
  });

  it('reads package default options from the installed plugin cache', () => {
    writeCodeGraphyInstalledPluginCache(
      {
        version: 1,
        plugins: [
          {
            package: '@codegraphy/plugin-godot',
            version: '2.1.2',
            apiVersion: '^2.0.0',
            disclosures: [],
            packageRoot: '/global/node_modules/@codegraphy/plugin-godot',
            defaultOptions: {
              includeSceneResources: true,
              includeAutoloads: true,
            },
          },
        ],
      },
      { homeDir },
    );

    expect(readInstalledPluginDefaultOptions('@codegraphy/plugin-godot', { homeDir })).toEqual({
      includeSceneResources: true,
      includeAutoloads: true,
    });
  });

  it('returns undefined when the installed plugin has no default options', () => {
    writeCodeGraphyInstalledPluginCache(
      {
        version: 1,
        plugins: [
          {
            package: '@codegraphy/plugin-python',
            version: '2.0.4',
            apiVersion: '^2.0.0',
            disclosures: [],
            packageRoot: '/global/node_modules/@codegraphy/plugin-python',
          },
        ],
      },
      { homeDir },
    );

    expect(readInstalledPluginDefaultOptions('@codegraphy/plugin-python', { homeDir })).toBeUndefined();
  });
});
