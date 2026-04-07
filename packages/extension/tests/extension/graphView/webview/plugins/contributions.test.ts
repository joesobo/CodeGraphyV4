import { describe, expect, it, vi } from 'vitest';
import {
  collectGraphViewContextMenuItems,
  collectGraphViewExporters,
  collectGraphViewToolbarActions,
  collectGraphViewWebviewInjections,
} from '../../../../../src/extension/graphView/webview/plugins/contributions';

describe('graphView/webview/plugins/contributions', () => {
  it('collects plugin context menu items with plugin-scoped indexes', () => {
    const items = collectGraphViewContextMenuItems(
      [{ plugin: { id: 'plugin.test' } }, { plugin: { id: 'plugin.other' } }],
      (pluginId) => {
        if (pluginId !== 'plugin.test') return undefined;
        return {
          contextMenuItems: [
            { label: 'Open', when: 'node' as const },
            { label: 'Inspect', when: 'edge' as const, icon: 'search', group: 'analysis' },
          ],
        };
      },
    );

    expect(items).toEqual([
      {
        label: 'Open',
        when: 'node',
        icon: undefined,
        group: undefined,
        pluginId: 'plugin.test',
        index: 0,
      },
      {
        label: 'Inspect',
        when: 'edge',
        icon: 'search',
        group: 'analysis',
        pluginId: 'plugin.test',
        index: 1,
      },
    ]);
  });

  it('collects plugin exporters with plugin-scoped indexes', () => {
    const items = collectGraphViewExporters(
      [
        { plugin: { id: 'plugin.test', name: 'Test Plugin' } },
        { plugin: { id: 'plugin.other', name: 'Other Plugin' } },
      ],
      (pluginId) => {
        if (pluginId !== 'plugin.test') return undefined;
        return {
          exporters: [
            { id: 'summary', label: 'Summary Export' },
            { id: 'trace', label: 'Trace Export', description: 'Detailed trace', group: 'Debug' },
          ],
        };
      },
    );

    expect(items).toEqual([
      {
        id: 'summary',
        label: 'Summary Export',
        description: undefined,
        group: undefined,
        pluginId: 'plugin.test',
        pluginName: 'Test Plugin',
        index: 0,
      },
      {
        id: 'trace',
        label: 'Trace Export',
        description: 'Detailed trace',
        group: 'Debug',
        pluginId: 'plugin.test',
        pluginName: 'Test Plugin',
        index: 1,
      },
    ]);
  });

  it('collects plugin toolbar actions with plugin-scoped indexes', () => {
    const items = collectGraphViewToolbarActions(
      [
        { plugin: { id: 'plugin.test', name: 'Test Plugin' } },
        { plugin: { id: 'plugin.other' } },
      ],
      (pluginId) => {
        if (pluginId !== 'plugin.test') return undefined;
        return {
          toolbarActions: [
            {
              id: 'open',
              label: 'Open',
              icon: 'target',
              description: 'Open the current file',
              items: [
                { id: 'open-file', label: 'Open File' },
                { id: 'open-folder', label: 'Open Folder', description: 'Open the workspace folder' },
              ],
            },
          ],
        };
      },
    );

    expect(items).toEqual([
      {
        id: 'open',
        label: 'Open',
        icon: 'target',
        description: 'Open the current file',
        pluginId: 'plugin.test',
        pluginName: 'Test Plugin',
        index: 0,
        items: [
          {
            id: 'open-file',
            label: 'Open File',
            description: undefined,
            index: 0,
          },
          {
            id: 'open-folder',
            label: 'Open Folder',
            description: 'Open the workspace folder',
            index: 1,
          },
        ],
      },
    ]);
  });

  it('collects plugin webview injections only for plugins with actual asset contributions', () => {
    const resolveAssetPath = vi.fn((assetPath: string, pluginId?: string) => `${pluginId}:${assetPath}`);

    const injections = collectGraphViewWebviewInjections(
      [
        { plugin: { id: 'plugin.none' } },
        {
          plugin: {
            id: 'plugin.assets',
            webviewContributions: {
              scripts: ['dist/plugin.js'],
              styles: ['dist/plugin.css'],
            },
          },
        },
        {
          plugin: {
            id: 'plugin.empty',
            webviewContributions: {
              scripts: [],
              styles: [],
            },
          },
        },
      ],
      resolveAssetPath,
    );

    expect(injections).toEqual([
      {
        pluginId: 'plugin.assets',
        scripts: ['plugin.assets:dist/plugin.js'],
        styles: ['plugin.assets:dist/plugin.css'],
      },
    ]);
    expect(resolveAssetPath).toHaveBeenCalledTimes(2);
  });

  it('collects style-only and script-only webview injections', () => {
    expect(
      collectGraphViewWebviewInjections(
        [
          {
            plugin: {
              id: 'plugin.styles',
              webviewContributions: {
                styles: ['dist/plugin.css'],
              },
            },
          },
          {
            plugin: {
              id: 'plugin.scripts',
              webviewContributions: {
                scripts: ['dist/plugin.js'],
              },
            },
          },
        ],
        (assetPath, pluginId) => `${pluginId}:${assetPath}`,
      ),
    ).toEqual([
      {
        pluginId: 'plugin.styles',
        scripts: [],
        styles: ['plugin.styles:dist/plugin.css'],
      },
      {
        pluginId: 'plugin.scripts',
        scripts: ['plugin.scripts:dist/plugin.js'],
        styles: [],
      },
    ]);
  });
});
