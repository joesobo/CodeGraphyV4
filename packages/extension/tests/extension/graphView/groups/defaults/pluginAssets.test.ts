import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import type { IPluginFileColorDefinition } from '@codegraphy-dev/extension-plugin-api';
import { getGraphViewPluginDefaultGroups } from '../../../../../src/extension/graphView/groups/defaults/plugin';

function extensionData(
  fileColors: Record<string, string | IPluginFileColorDefinition>,
) {
  return { fileColors };
}

describe('graphView/pluginDefaultGroups', () => {
  it('returns no plugin default groups when the analyzer is unavailable', () => {
    expect(
      getGraphViewPluginDefaultGroups(
        undefined,
        new Set<string>(),
        new Map<string, vscode.Uri>(),
        vscode.Uri.file('/test/extension'),
      ),
    ).toEqual([]);
  });

  it('does not register a Core plugin ID as an Extension asset root', () => {
    const pluginExtensionUris = new Map<string, vscode.Uri>();

    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          extensionPlugins: {
            list: () => [
              {
                builtIn: true,
                plugin: {
                  id: 'codegraphy.godot',
                  name: 'Godot',
                },
                data: extensionData({
                  '*.gd': '#478CBF',
                  '*.tscn': {
                    color: '#478CBF',
                    shape2D: 'hexagon',
                    imagePath: 'assets/godot.svg',
                  },
                }),
              },
            ],
          },
        },
      },
      new Set<string>(),
      pluginExtensionUris,
      vscode.Uri.file('/test/extension'),
    );

    expect(groups).toEqual([
      {
        id: 'plugin:codegraphy.godot:*.gd',
        pattern: '*.gd',
        color: '#478CBF',
        isPluginDefault: true,
        pluginId: 'codegraphy.godot',
        pluginName: 'Godot',
      },
      {
        id: 'plugin:codegraphy.godot:*.tscn',
        pattern: '*.tscn',
        color: '#478CBF',
        isPluginDefault: true,
        pluginId: 'codegraphy.godot',
        pluginName: 'Godot',
        shape2D: 'hexagon',
        imagePath: 'assets/godot.svg',
      },
    ]);
    expect(pluginExtensionUris.has('codegraphy.godot')).toBe(false);
  });

  it('reuses an existing built-in plugin root registration', () => {
    const existingUri = vscode.Uri.file('/custom/plugin-typescript');
    const pluginExtensionUris = new Map<string, vscode.Uri>([
      ['codegraphy.typescript', existingUri],
    ]);

    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          extensionPlugins: {
            list: () => [
              {
                builtIn: true,
                plugin: {
                  id: 'codegraphy.typescript',
                  name: 'TypeScript',
                },
                data: extensionData({ '*.ts': '#3178C6' }),
              },
            ],
          },
        },
      },
      new Set<string>(),
      pluginExtensionUris,
      vscode.Uri.file('/test/extension'),
    );

    expect(groups).toEqual([
      {
        id: 'plugin:codegraphy.typescript:*.ts',
        pattern: '*.ts',
        color: '#3178C6',
        isPluginDefault: true,
        pluginId: 'codegraphy.typescript',
        pluginName: 'TypeScript',
      },
    ]);
    expect(pluginExtensionUris.get('codegraphy.typescript')).toBe(existingUri);
  });

  it('registers Unity built-in asset roots and copies icon metadata', () => {
    const pluginExtensionUris = new Map<string, vscode.Uri>();

    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          extensionPlugins: {
            list: () => [
              {
                builtIn: true,
                plugin: {
                  id: 'codegraphy.unity.extension',
                  name: 'Unity Graph View',
                },
                data: extensionData({
                  '*.unity': {
                    color: '#F97316',
                    shape2D: 'hexagon',
                    imagePath: 'assets/unity.svg',
                  },
                }),
              },
            ],
          },
        },
      },
      new Set<string>(),
      pluginExtensionUris,
      vscode.Uri.file('/test/extension'),
    );

    expect(groups).toEqual([
      {
        id: 'plugin:codegraphy.unity.extension:*.unity',
        pattern: '*.unity',
        color: '#F97316',
        isPluginDefault: true,
        pluginId: 'codegraphy.unity.extension',
        pluginName: 'Unity Graph View',
        shape2D: 'hexagon',
        imagePath: 'assets/unity.svg',
      },
    ]);
    expect(pluginExtensionUris.get('codegraphy.unity.extension')?.fsPath).toBe(
      '/test/extension/packages/plugin-unity',
    );
  });

  it('keeps unknown built-in plugins unregistered while still returning their groups', () => {
    const pluginExtensionUris = new Map<string, vscode.Uri>();

    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          extensionPlugins: {
            list: () => [
              {
                builtIn: true,
                plugin: {
                  id: 'codegraphy.unknown',
                  name: 'Unknown',
                },
                data: extensionData({ '*.unknown': '#999999' }),
              },
            ],
          },
        },
      },
      new Set<string>(),
      pluginExtensionUris,
      vscode.Uri.file('/test/extension'),
    );

    expect(groups).toEqual([
      {
        id: 'plugin:codegraphy.unknown:*.unknown',
        pattern: '*.unknown',
        color: '#999999',
        isPluginDefault: true,
        pluginId: 'codegraphy.unknown',
        pluginName: 'Unknown',
      },
    ]);
    expect(pluginExtensionUris.has('codegraphy.unknown')).toBe(false);
  });


});
