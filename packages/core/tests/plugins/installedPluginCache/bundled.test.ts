import { afterEach, describe, expect, it, vi } from 'vitest';

describe('plugins/installedPluginCache/bundled', () => {
  afterEach(() => {
    vi.doUnmock('@codegraphy-dev/plugin-markdown');
    vi.resetModules();
  });

  it('returns bundled Markdown metadata without importing the Markdown runtime', async () => {
    vi.resetModules();
    vi.doMock('@codegraphy-dev/plugin-markdown', () => {
      throw new Error('Markdown runtime was imported');
    });

    const { createBundledMarkdownInstalledPluginRecord } = await import(
      '../../../src/plugins/installedPluginCache/bundled'
    );

    expect(createBundledMarkdownInstalledPluginRecord()).toEqual({
      package: '@codegraphy-dev/plugin-markdown',
      version: '1.0.0',
      id: 'codegraphy.markdown',
      name: 'Markdown',
      host: 'core',
      entry: './dist/plugin.js',
      apiVersion: '^4.0.0',
      data: {
        updateImpact: {
          toggle: 'reanalyze-plugin-files',
          defaultSetting: 'reanalyze-plugin-files',
        },
      },
      packageRoot: 'codegraphy:bundled',
      globallyEnabled: true,
    });
  });
});
