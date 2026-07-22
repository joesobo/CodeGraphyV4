import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import { getGraphViewPluginDefaultGroups } from '../../../../../src/extension/graphView/groups/defaults/plugin';

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

  it('builds plugin default groups and registers known built-in asset roots', () => {
    const pluginExtensionUris = new Map<string, vscode.Uri>();

    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          list: () => [
            {
              builtIn: true,
              plugin: {
                id: 'codegraphy.godot',
                name: 'Godot',
                fileColors: {
                  '*.gd': '#478CBF',
                  '*.tscn': {
                    color: '#478CBF',
                    shape2D: 'hexagon',
                    imagePath: 'assets/godot.svg',
                  },
                },
              },
            },
          ],
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
    expect(pluginExtensionUris.get('codegraphy.godot')?.fsPath).toBe(
      '/test/extension/packages/plugin-godot',
    );
  });

  it('reuses an existing built-in plugin root registration', () => {
    const existingUri = vscode.Uri.file('/custom/plugin-typescript');
    const pluginExtensionUris = new Map<string, vscode.Uri>([
      ['codegraphy.typescript', existingUri],
    ]);

    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          list: () => [
            {
              builtIn: true,
              plugin: {
                id: 'codegraphy.typescript',
                name: 'TypeScript',
                fileColors: { '*.ts': '#3178C6' },
              },
            },
          ],
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
          list: () => [
            {
              builtIn: true,
              plugin: {
                id: 'codegraphy.unity',
                name: 'Unity',
                fileColors: {
                  '*.unity': {
                    color: '#F97316',
                    shape2D: 'hexagon',
                    imagePath: 'assets/unity.svg',
                  },
                },
              },
            },
          ],
        },
      },
      new Set<string>(),
      pluginExtensionUris,
      vscode.Uri.file('/test/extension'),
    );

    expect(groups).toEqual([
      {
        id: 'plugin:codegraphy.unity:*.unity',
        pattern: '*.unity',
        color: '#F97316',
        isPluginDefault: true,
        pluginId: 'codegraphy.unity',
        pluginName: 'Unity',
        shape2D: 'hexagon',
        imagePath: 'assets/unity.svg',
      },
    ]);
    expect(pluginExtensionUris.get('codegraphy.unity')?.fsPath).toBe(
      '/test/extension/packages/plugin-unity',
    );
  });

  it('keeps unknown built-in plugins unregistered while still returning their groups', () => {
    const pluginExtensionUris = new Map<string, vscode.Uri>();

    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          list: () => [
            {
              builtIn: true,
              plugin: {
                id: 'codegraphy.unknown',
                name: 'Unknown',
                fileColors: { '*.unknown': '#999999' },
              },
            },
          ],
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
