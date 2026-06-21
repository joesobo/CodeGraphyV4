import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CorePluginRegistry } from '../../src/plugins/registry';

describe('indexing/defaultPlugins runtime loading', () => {
  afterEach(() => {
    vi.doUnmock('@codegraphy-dev/plugin-markdown');
    vi.resetModules();
  });

  it('does not import the Markdown runtime when Plugin Activity State disables Markdown', { timeout: 10000 }, async () => {
    vi.resetModules();
    vi.doMock('@codegraphy-dev/plugin-markdown', () => {
      throw new Error('Markdown runtime was imported');
    });

    const { registerDefaultIndexPlugins } = await import('../../src/indexing/defaultPlugins');
    const {
      CODEGRAPHY_MARKDOWN_PLUGIN_ID,
      createDefaultCodeGraphyWorkspaceSettings,
    } = await import('../../src/workspace/settingsDefaults');
    const registered: string[] = [];
    let coreAnalyzerRegistered = false;
    const registry = {
      register(plugin: IPlugin) {
        registered.push(plugin.id);
      },
      setCoreAnalyzeFileResult() {
        coreAnalyzerRegistered = true;
      },
    } as unknown as CorePluginRegistry;

    await registerDefaultIndexPlugins(
      registry,
      {
        workspaceRoot: '/workspace',
        disabledPlugins: [CODEGRAPHY_MARKDOWN_PLUGIN_ID],
      },
      {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        plugins: [{ id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, enabled: true }],
      },
    );

    expect(registered).toEqual([]);
    expect(coreAnalyzerRegistered).toBe(true);
  });
});
