import { describe, expect, it, vi } from 'vitest';
import {
  buildGraphViewDecorationPayload,
  collectGraphViewContextMenuItems,
  collectGraphViewWebviewInjections,
} from '../../../src/extension/graphView/pluginMessages';

describe('graphViewPluginMessages', () => {
  it('strips priority fields while preserving merged decoration payloads', () => {
    const payload = buildGraphViewDecorationPayload(
      new Map([
        [
          'src/app.ts',
          {
            color: '#ffffff',
            priority: 10,
            label: { text: 'App' },
          },
        ],
      ]),
      new Map([
        [
          'src/app.ts->src/lib.ts',
          {
            color: '#000000',
            priority: 5,
            width: 2,
          },
        ],
      ])
    );

    expect(payload).toEqual({
      nodeDecorations: {
        'src/app.ts': {
          color: '#ffffff',
          label: { text: 'App' },
        },
      },
      edgeDecorations: {
        'src/app.ts->src/lib.ts': {
          color: '#000000',
          width: 2,
        },
      },
    });
  });

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
      }
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
      resolveAssetPath
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

  it('collects style-only webview injections when scripts are omitted', () => {
    const injections = collectGraphViewWebviewInjections(
      [
        {
          plugin: {
            id: 'plugin.styles',
            webviewContributions: {
              styles: ['dist/plugin.css'],
            },
          },
        },
      ],
      (assetPath, pluginId) => `${pluginId}:${assetPath}`
    );

    expect(injections).toEqual([
      {
        pluginId: 'plugin.styles',
        scripts: [],
        styles: ['plugin.styles:dist/plugin.css'],
      },
    ]);
  });

  it('collects script-only webview injections when styles are omitted', () => {
    const injections = collectGraphViewWebviewInjections(
      [
        {
          plugin: {
            id: 'plugin.scripts',
            webviewContributions: {
              scripts: ['dist/plugin.js'],
            },
          },
        },
      ],
      (assetPath, pluginId) => `${pluginId}:${assetPath}`
    );

    expect(injections).toEqual([
      {
        pluginId: 'plugin.scripts',
        scripts: ['plugin.scripts:dist/plugin.js'],
        styles: [],
      },
    ]);
  });
});
