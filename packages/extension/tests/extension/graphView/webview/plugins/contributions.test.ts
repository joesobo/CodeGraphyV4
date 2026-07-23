import { describe, expect, it, vi } from 'vitest';
import { collectGraphViewWebviewInjections } from '../../../../../src/extension/graphView/webview/plugins/contributions';

describe('graphView/webview/plugins/contributions', () => {
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
              assets: [
                { id: 'fireflies', label: 'Fireflies', path: '.codegraphy/cache/particles/fireflies.js' },
              ],
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
        assets: [
          {
            id: 'fireflies',
            label: 'Fireflies',
            path: '.codegraphy/cache/particles/fireflies.js',
            url: 'plugin.assets:.codegraphy/cache/particles/fireflies.js',
          },
        ],
      },
    ]);
    expect(resolveAssetPath).toHaveBeenCalledTimes(3);
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
        assets: [],
      },
      {
        pluginId: 'plugin.scripts',
        scripts: ['plugin.scripts:dist/plugin.js'],
        styles: [],
        assets: [],
      },
    ]);
  });

  it('sends an empty replacement when a revised plugin removes its webview assets', () => {
    expect(collectGraphViewWebviewInjections(
      [{ descriptorSignature: 'build-v2', plugin: { id: 'plugin.rebuilt' } }],
      assetPath => assetPath,
    )).toEqual([{
      pluginId: 'plugin.rebuilt',
      revision: 'build-v2',
      scripts: [],
      styles: [],
      assets: [],
    }]);
  });

  it('changes every webview asset URL when a linked runtime revision changes', () => {
    const plugin = {
      plugin: {
        id: 'plugin.rebuilt',
        webviewContributions: {
          scripts: ['dist/plugin.js'],
          styles: ['dist/plugin.css'],
          assets: [{ id: 'icon', label: 'Icon', path: 'assets/icon.svg' }],
        },
      },
    };
    const resolveAssetPath = (assetPath: string) => `vscode-webview://plugin/${assetPath}`;
    const first = collectGraphViewWebviewInjections(
      [{ ...plugin, descriptorSignature: 'build-v1' }],
      resolveAssetPath,
    )[0];
    const second = collectGraphViewWebviewInjections(
      [{ ...plugin, descriptorSignature: 'build-v2' }],
      resolveAssetPath,
    )[0];

    expect(second.scripts).not.toEqual(first.scripts);
    expect(second.styles).not.toEqual(first.styles);
    expect(second.assets.map(asset => asset.url)).not.toEqual(
      first.assets.map(asset => asset.url),
    );
  });
});
