import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { describe, expect, it } from 'vitest';
import {
  registerDefaultIndexPlugins,
  registerProvidedPlugins,
} from '../../src/indexing/defaultPlugins';
import type { CorePluginRegistry } from '../../src/plugins/registry';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  createDefaultCodeGraphyWorkspaceSettings,
} from '../../src/workspace/settingsDefaults';

interface RegisteredPlugin {
  id: string;
  options?: Record<string, unknown>;
  sourcePackage?: string;
}

function registry(): { coreAnalyzerRegistered: { current: boolean }; registry: CorePluginRegistry; registered: RegisteredPlugin[] } {
  const registered: RegisteredPlugin[] = [];
  const coreAnalyzerRegistered = { current: false };
  return {
    coreAnalyzerRegistered,
    registered,
    registry: {
      register(plugin: IPlugin, options: Omit<RegisteredPlugin, 'id'> = {}) {
        registered.push({
          id: plugin.id,
          ...options,
        });
      },
      setCoreAnalyzeFileResult() {
        coreAnalyzerRegistered.current = true;
      },
    } as unknown as CorePluginRegistry,
  };
}

function plugin(id: string): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '3',
    supportedExtensions: ['.test'],
  };
}

describe('indexing/defaultPlugins', () => {
  it('skips bundled defaults when core plugins are disabled', async () => {
    const harness = registry();

    await registerDefaultIndexPlugins(
      harness.registry,
      { workspaceRoot: '/workspace', includeCorePlugins: false },
      {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        plugins: [{ id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, enabled: true }],
      },
    );

    expect(harness.registered).toEqual([]);
    expect(harness.coreAnalyzerRegistered.current).toBe(false);
  });

  it('registers core Tree-sitter analysis and configured Markdown when enabled after other workspace plugins', async () => {
    const harness = registry();

    await registerDefaultIndexPlugins(
      harness.registry,
      { workspaceRoot: '/workspace' },
      {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        plugins: [
          {
            id: 'codegraphy.vue',
            enabled: true,
            options: { includeTests: true },
          },
          {
            id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
            enabled: true,
            options: { wikilinks: true },
          },
        ],
      },
    );

    expect(harness.registered).toEqual([
      {
        id: 'codegraphy.markdown',
        builtIn: true,
        sourcePackage: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
        options: { wikilinks: true },
      },
    ]);
    expect(harness.coreAnalyzerRegistered.current).toBe(true);
  });

  it('registers core Tree-sitter analysis without Markdown when Markdown is not enabled in workspace settings', async () => {
    const harness = registry();

    await registerDefaultIndexPlugins(
      harness.registry,
      { workspaceRoot: '/workspace' },
      {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        plugins: [{ id: 'codegraphy.vue', enabled: true }],
      },
    );

    expect(harness.registered).toEqual([]);
    expect(harness.coreAnalyzerRegistered.current).toBe(true);
  });

  it('registers core Tree-sitter analysis without Markdown when Plugin Activity State disables Markdown', async () => {
    const harness = registry();

    await registerDefaultIndexPlugins(
      harness.registry,
      {
        workspaceRoot: '/workspace',
        disabledPlugins: ['codegraphy.markdown'],
      },
      {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        plugins: [{ id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, enabled: true }],
      },
    );

    expect(harness.registered).toEqual([]);
    expect(harness.coreAnalyzerRegistered.current).toBe(true);
  });

  it('does not register Markdown when a provided plugin already owns the Markdown id', async () => {
    const harness = registry();
    const markdown = plugin('codegraphy.markdown');

    await registerDefaultIndexPlugins(
      harness.registry,
      { workspaceRoot: '/workspace', plugins: [markdown] },
      {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        plugins: [{ id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, enabled: true }],
      },
    );
    registerProvidedPlugins(harness.registry, [markdown, plugin('custom')]);

    expect(harness.registered.map(entry => entry.id)).toEqual([
      'codegraphy.markdown',
      'custom',
    ]);
    expect(harness.coreAnalyzerRegistered.current).toBe(true);
  });

  it('ignores missing provided plugin arrays', () => {
    const harness = registry();

    registerProvidedPlugins(harness.registry, undefined);

    expect(harness.registered).toEqual([]);
  });

  it('does not register provided plugins disabled by Plugin Activity State', () => {
    const harness = registry();

    registerProvidedPlugins(
      harness.registry,
      [plugin('active'), plugin('disabled')],
      ['disabled'],
    );

    expect(harness.registered.map(entry => entry.id)).toEqual(['active']);
  });
});
