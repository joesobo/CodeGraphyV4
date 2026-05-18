import { describe, expect, it, vi } from 'vitest';
import { applyPluginPackageOrderUpdate } from '../../../../../../src/extension/graphView/webview/settingsMessages/updates/pluginPackageOrder';
import { createHandlers } from '../testSupport';

describe('settingsMessages/updates/pluginPackageOrder', () => {
  it('reorders workspace plugin entries by package name while preserving options', async () => {
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [
            {
              package: '@codegraphy/plugin-markdown',
              options: { includeWikiLinks: true },
            },
            {
              package: '@codegraphy/plugin-python',
              options: { includeTests: true },
            },
          ] as T;
        }
        return defaultValue;
      }),
    });

    await applyPluginPackageOrderUpdate(
      {
        type: 'UPDATE_PLUGIN_PACKAGE_ORDER',
        payload: {
          packageNames: ['@codegraphy/plugin-python', '@codegraphy/plugin-markdown'],
        },
      },
      handlers,
    );

    expect(handlers.updateConfig).toHaveBeenCalledWith('plugins', [
      {
        package: '@codegraphy/plugin-python',
        options: { includeTests: true },
      },
      {
        package: '@codegraphy/plugin-markdown',
        options: { includeWikiLinks: true },
      },
    ]);
    expect(handlers.analyzeAndSendData).toHaveBeenCalledOnce();
  });
});
