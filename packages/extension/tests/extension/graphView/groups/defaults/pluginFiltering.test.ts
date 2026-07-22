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
    interfaces?: Array<{ id: string; data: { fileColors: FileColors } }>;
    plugin: {
      id: string;
      name: string;
    };
  };
  const extensionInterfaces = (fileColors: FileColors) => ([{
    id: 'codegraphy.extension',
    data: { fileColors },
  }]);

  it('does not add optional metadata keys when a plugin color definition only provides a color', () => {
    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          list: () => [
            {
              plugin: {
                id: 'codegraphy.rust',
                name: 'Rust',
              },
              interfaces: extensionInterfaces({ '*.rs': { color: '#DEA584' } }),
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
          list: (): PluginInfoLike[] => [
            {
              plugin: {
                id: 'codegraphy.typescript',
                name: 'TypeScript',
              },
              interfaces: extensionInterfaces({ '*.ts': '#3178C6' }),
            },
            {
              plugin: {
                id: 'codegraphy.typescript',
                name: 'TypeScript',
              },
              interfaces: extensionInterfaces({ '*.ts': '#3178C6' }),
            },
            {
              plugin: {
                id: 'codegraphy.vue',
                name: 'Vue',
              },
              interfaces: extensionInterfaces({ '*.vue': '#41B883' }),
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
          list: (): PluginInfoLike[] => [
            {
              plugin: {
                id: 'codegraphy.godot',
                name: 'Godot',
              },
              interfaces: extensionInterfaces({
                '*.gd': { color: '#478CBF' },
                '*.godot': { color: '#6A9FB5' },
              }),
            },
            {
              plugin: {
                id: 'codegraphy.godot',
                name: 'Godot',
              },
              interfaces: extensionInterfaces({
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
});
