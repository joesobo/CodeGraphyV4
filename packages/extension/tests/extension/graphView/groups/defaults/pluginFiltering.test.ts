import { describe, expect, it } from 'vitest';
import type { NodeShape2D } from '@/shared/settings/modes';
import * as vscode from 'vscode';
import { getGraphViewPluginDefaultGroups } from '../../../../../src/extension/graphView/groups/defaults/plugin';

describe('graphView/pluginDefaultGroups', () => {
  type FileColors = Record<
    string,
    string | { color: string; shape2D?: NodeShape2D; imagePath?: string }
  >;
  type PluginInfoLike = {
    builtIn?: boolean;
    data?: { fileColors: FileColors };
    plugin: {
      id: string;
      name: string;
    };
  };
  const extensionData = (fileColors: FileColors) => ({ fileColors });

  it('does not add optional metadata keys when a plugin color definition only provides a color', () => {
    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          extensionPlugins: {
            list: () => [
              {
                plugin: {
                  id: 'codegraphy.rust',
                  name: 'Rust',
                },
                data: extensionData({ '*.rs': { color: '#DEA584' } }),
              },
            ],
          },
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
      pluginId: 'codegraphy.rust',
      pluginName: 'Rust',
    });
    expect(groups[0]).not.toHaveProperty('shape2D');
    expect(groups[0]).not.toHaveProperty('imagePath');
  });

  it('skips disabled plugins and deduplicates duplicate patterns', () => {
    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          extensionPlugins: {
            list: (): PluginInfoLike[] => [
              {
                plugin: {
                  id: 'codegraphy.typescript',
                  name: 'TypeScript',
                },
                data: extensionData({ '*.ts': '#3178C6' }),
              },
              {
                plugin: {
                  id: 'codegraphy.typescript',
                  name: 'TypeScript',
                },
                data: extensionData({ '*.ts': '#3178C6' }),
              },
              {
                plugin: {
                  id: 'codegraphy.vue',
                  name: 'Vue',
                },
                data: extensionData({ '*.vue': '#41B883' }),
              },
            ],
          },
        },
      },
      new Set(['codegraphy.typescript']),
      new Map<string, vscode.Uri>(),
      vscode.Uri.file('/test/extension'),
    );

    expect(groups).toEqual([
      {
        id: 'plugin:codegraphy.vue:*.vue',
        pattern: '*.vue',
        color: '#41B883',
        isPluginDefault: true,
        pluginId: 'codegraphy.vue',
        pluginName: 'Vue',
      },
    ]);
  });

  it('deduplicates repeated plugin patterns and only copies defined metadata', () => {
    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          extensionPlugins: {
            list: (): PluginInfoLike[] => [
              {
                plugin: {
                  id: 'codegraphy.godot',
                  name: 'Godot',
                },
                data: extensionData({
                  '*.gd': { color: '#478CBF' },
                  '*.godot': { color: '#6A9FB5' },
                }),
              },
              {
                plugin: {
                  id: 'codegraphy.godot',
                  name: 'Godot',
                },
                data: extensionData({
                  '*.gd': {
                    color: '#111111',
                    shape2D: 'hexagon',
                    imagePath: 'duplicate.svg',
                  },
                }),
              },
            ],
          },
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
        pluginId: 'codegraphy.godot',
        pluginName: 'Godot',
      },
      {
        id: 'plugin:codegraphy.godot:*.godot',
        pattern: '*.godot',
        color: '#6A9FB5',
        isPluginDefault: true,
        pluginId: 'codegraphy.godot',
        pluginName: 'Godot',
      },
    ]);
  });

  it('ignores malformed Extension metadata without blocking healthy plugin defaults', () => {
    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          extensionPlugins: {
            list: () => [
              {
                plugin: { id: 'acme.broken', name: 'Broken' },
                data: {
                  fileColors: {
                    '*.null': null,
                    '*.missing-color': { shape2D: 'circle' },
                    '*.bad-shape': { color: '#111111', shape2D: 'octagon' },
                  },
                },
              },
              {
                plugin: { id: 'acme.healthy', name: 'Healthy' },
                data: extensionData({ '*.healthy': '#22C55E' }),
              },
            ],
          },
        },
      } as never,
      new Set<string>(),
      new Map<string, vscode.Uri>(),
      vscode.Uri.file('/test/extension'),
    );

    expect(groups).toEqual([{
      id: 'plugin:acme.healthy:*.healthy',
      pattern: '*.healthy',
      color: '#22C55E',
      isPluginDefault: true,
      pluginId: 'acme.healthy',
      pluginName: 'Healthy',
    }]);
  });
});
