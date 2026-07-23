import { describe, expect, it } from 'vitest';
import type { NodeShape2D } from '@/shared/settings/modes';
import type { IExtensionPluginLegendEntry } from '@codegraphy-dev/extension-plugin-api';
import * as vscode from 'vscode';
import { getGraphViewPluginDefaultGroups } from '../../../../../src/extension/graphView/groups/defaults/plugin';

describe('graphView/pluginDefaultGroups', () => {
  type FileColors = Record<
    string,
    string | { color: string; shape2D?: NodeShape2D; imagePath?: string }
  >;
  type PluginInfoLike = {
    builtIn?: boolean;
    data?: { legendEntries: readonly IExtensionPluginLegendEntry[] };
    plugin: {
      id: string;
      name: string;
    };
  };
  const extensionData = (pluginId: string, fileColors: FileColors) => ({
    legendEntries: Object.entries(fileColors).map(([pattern, value]) => ({
      id: `plugin:${pluginId}:${pattern}`,
      label: pattern,
      pattern,
      color: typeof value === 'string' ? value : value.color,
      ...(typeof value === 'object' && value.shape2D ? { shape2D: value.shape2D } : {}),
      ...(typeof value === 'object' && value.imagePath ? { imagePath: value.imagePath } : {}),
    })) satisfies IExtensionPluginLegendEntry[],
  });

  it('maps Extension plugin Legend Entries into Graph View defaults', () => {
    const groups = getGraphViewPluginDefaultGroups(
      {
        registry: {
          extensionPlugins: {
            list: () => [
              {
                plugin: {
                  id: 'codegraphy.godot.extension',
                  name: 'Godot Graph View',
                },
                data: {
                  legendEntries: [
                    {
                      id: 'plugin:codegraphy.gdscript:symbol:signal',
                      label: 'Signal',
                      pattern: '**',
                      color: '#EF4444',
                      match: {
                        nodeType: 'symbol',
                        symbolKinds: ['signal'],
                        symbolPluginKind: 'signal',
                        symbolSource: 'codegraphy.gdscript',
                      },
                      imagePath: 'assets/godot.svg',
                    },
                  ],
                },
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
        id: 'plugin:codegraphy.gdscript:symbol:signal',
        pattern: '**',
        displayLabel: 'Signal',
        color: '#EF4444',
        matchNodeType: 'symbol',
        matchSymbolKinds: ['signal'],
        matchSymbolPluginKind: 'signal',
        matchSymbolSource: 'codegraphy.gdscript',
        imagePath: 'assets/godot.svg',
        isPluginDefault: true,
        pluginId: 'codegraphy.godot.extension',
        pluginName: 'Godot Graph View',
      },
    ]);
  });

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
                data: extensionData('codegraphy.rust', { '*.rs': { color: '#DEA584' } }),
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
      displayLabel: '*.rs',
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
                data: extensionData('codegraphy.typescript', { '*.ts': '#3178C6' }),
              },
              {
                plugin: {
                  id: 'codegraphy.typescript',
                  name: 'TypeScript',
                },
                data: extensionData('codegraphy.typescript', { '*.ts': '#3178C6' }),
              },
              {
                plugin: {
                  id: 'codegraphy.vue',
                  name: 'Vue',
                },
                data: extensionData('codegraphy.vue', { '*.vue': '#41B883' }),
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
        displayLabel: '*.vue',
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
                data: extensionData('codegraphy.godot', {
                  '*.gd': { color: '#478CBF' },
                  '*.godot': { color: '#6A9FB5' },
                }),
              },
              {
                plugin: {
                  id: 'codegraphy.godot',
                  name: 'Godot',
                },
                data: extensionData('codegraphy.godot', {
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
        displayLabel: '*.gd',
        color: '#478CBF',
        isPluginDefault: true,
        pluginId: 'codegraphy.godot',
        pluginName: 'Godot',
      },
      {
        id: 'plugin:codegraphy.godot:*.godot',
        pattern: '*.godot',
        displayLabel: '*.godot',
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
                  legendEntries: [
                    null,
                    { id: 'missing-color', label: 'Missing', pattern: '*.missing-color' },
                    {
                      id: 'bad-shape',
                      label: 'Bad shape',
                      pattern: '*.bad-shape',
                      color: '#111111',
                      shape2D: 'octagon',
                    },
                  ],
                },
              },
              {
                plugin: { id: 'acme.healthy', name: 'Healthy' },
                data: extensionData('acme.healthy', { '*.healthy': '#22C55E' }),
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
      displayLabel: '*.healthy',
      color: '#22C55E',
      isPluginDefault: true,
      pluginId: 'acme.healthy',
      pluginName: 'Healthy',
    }]);
  });
});
