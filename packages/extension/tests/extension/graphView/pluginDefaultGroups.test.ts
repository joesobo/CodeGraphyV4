import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import { getGraphViewPluginDefaultGroups } from '../../../src/extension/graphView/pluginDefaultGroups';

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

  it('builds plugin default groups and registers built-in asset roots', () => {
    const pluginExtensionUris = new Map<string, vscode.Uri>();

    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          list: () => [
            {
              builtIn: true,
              plugin: {
                id: 'codegraphy.typescript',
                name: 'TypeScript',
                fileColors: {
                  '*.ts': '#3178C6',
                  '*.tsx': {
                    color: '#3178C6',
                    shape2D: 'hexagon',
                    image: 'assets/ts.svg',
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
        id: 'plugin:codegraphy.typescript:*.ts',
        pattern: '*.ts',
        color: '#3178C6',
        isPluginDefault: true,
        pluginName: 'TypeScript',
      },
      {
        id: 'plugin:codegraphy.typescript:*.tsx',
        pattern: '*.tsx',
        color: '#3178C6',
        isPluginDefault: true,
        pluginName: 'TypeScript',
        shape2D: 'hexagon',
        imagePath: 'assets/ts.svg',
      },
    ]);
    expect(pluginExtensionUris.get('codegraphy.typescript')?.fsPath).toBe(
      '/test/extension/packages/plugin-typescript',
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
        pluginName: 'TypeScript',
      },
    ]);
    expect(pluginExtensionUris.get('codegraphy.typescript')).toBe(existingUri);
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
        pluginName: 'Unknown',
      },
    ]);
    expect(pluginExtensionUris.has('codegraphy.unknown')).toBe(false);
  });

  it('copies 3d shape metadata from plugin color definitions', () => {
    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          list: () => [
            {
              plugin: {
                id: 'codegraphy.godot',
                name: 'Godot',
                fileColors: {
                  '*.gd': {
                    color: '#478CBF',
                    shape3D: 'sphere',
                  },
                },
              },
            },
          ],
        },
      },
      new Set<string>(),
      new Map<string, vscode.Uri>(),
      vscode.Uri.file('/test/extension'),
    );

    expect(groups).toEqual([
      {
        id: 'plugin:codegraphy.godot:*.gd',
        pattern: '*.gd',
        color: '#478CBF',
        isPluginDefault: true,
        pluginName: 'Godot',
        shape3D: 'sphere',
      },
    ]);
  });

  it('does not add optional metadata keys when a plugin color definition only provides a color', () => {
    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          list: () => [
            {
              plugin: {
                id: 'codegraphy.rust',
                name: 'Rust',
                fileColors: {
                  '*.rs': {
                    color: '#DEA584',
                  },
                },
              },
            },
          ],
        },
      },
      new Set<string>(),
      new Map<string, vscode.Uri>(),
      vscode.Uri.file('/test/extension'),
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual({
      id: 'plugin:codegraphy.rust:*.rs',
      pattern: '*.rs',
      color: '#DEA584',
      isPluginDefault: true,
      pluginName: 'Rust',
    });
    expect(groups[0]).not.toHaveProperty('shape2D');
    expect(groups[0]).not.toHaveProperty('shape3D');
    expect(groups[0]).not.toHaveProperty('imagePath');
  });

  it('skips disabled plugins and deduplicates duplicate patterns', () => {
    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          list: () => [
            {
              plugin: {
                id: 'codegraphy.typescript',
                name: 'TypeScript',
                fileColors: { '*.ts': '#3178C6' },
              },
            },
            {
              plugin: {
                id: 'codegraphy.typescript',
                name: 'TypeScript',
                fileColors: { '*.ts': '#3178C6' },
              },
            },
            {
              plugin: {
                id: 'codegraphy.python',
                name: 'Python',
                fileColors: { '*.py': '#3776AB' },
              },
            },
          ],
        },
      },
      new Set(['codegraphy.typescript']),
      new Map<string, vscode.Uri>(),
      vscode.Uri.file('/test/extension'),
    );

    expect(groups).toEqual([
      {
        id: 'plugin:codegraphy.python:*.py',
        pattern: '*.py',
        color: '#3776AB',
        isPluginDefault: true,
        pluginName: 'Python',
      },
    ]);
  });

  it('deduplicates repeated plugin patterns and only copies defined metadata', () => {
    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          list: () => [
            {
              plugin: {
                id: 'codegraphy.godot',
                name: 'Godot',
                fileColors: {
                  '*.gd': {
                    color: '#478CBF',
                    shape3D: 'sphere',
                  },
                  '*.godot': {
                    color: '#6A9FB5',
                  },
                },
              },
            },
            {
              plugin: {
                id: 'codegraphy.godot',
                name: 'Godot',
                fileColors: {
                  '*.gd': {
                    color: '#111111',
                    shape2D: 'hexagon',
                    image: 'duplicate.svg',
                  },
                },
              },
            },
          ],
        },
      },
      new Set<string>(),
      new Map<string, vscode.Uri>(),
      vscode.Uri.file('/test/extension'),
    );

    expect(groups).toEqual([
      {
        id: 'plugin:codegraphy.godot:*.gd',
        pattern: '*.gd',
        color: '#478CBF',
        isPluginDefault: true,
        pluginName: 'Godot',
        shape3D: 'sphere',
      },
      {
        id: 'plugin:codegraphy.godot:*.godot',
        pattern: '*.godot',
        color: '#6A9FB5',
        isPluginDefault: true,
        pluginName: 'Godot',
      },
    ]);
  });
});
