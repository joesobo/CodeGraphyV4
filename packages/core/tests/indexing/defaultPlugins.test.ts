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

function registry(): { registry: CorePluginRegistry; registered: RegisteredPlugin[] } {
  const registered: RegisteredPlugin[] = [];
  return {
    registered,
    registry: {
      register(plugin: IPlugin, options: Omit<RegisteredPlugin, 'id'> = {}) {
        registered.push({
          id: plugin.id,
          ...options,
        });
      },
    } as unknown as CorePluginRegistry,
  };
}

function plugin(id: string): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '2',
    supportedExtensions: ['.test'],
  };
}

describe('indexing/defaultPlugins', () => {
  it('skips bundled defaults when core plugins are disabled', () => {
    const harness = registry();

    registerDefaultIndexPlugins(
      harness.registry,
      { workspaceRoot: '/workspace', includeCorePlugins: false },
      {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        plugins: [{ id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, enabled: true }],
      },
    );

    expect(harness.registered).toEqual([]);
  });

  it('registers tree-sitter and configured Markdown when enabled after other workspace plugins', () => {
    const harness = registry();

    registerDefaultIndexPlugins(
      harness.registry,
      { workspaceRoot: '/workspace' },
      {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        plugins: [
          {
            id: 'codegraphy.python',
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
      { id: 'codegraphy.treesitter', builtIn: true },
      {
        id: 'codegraphy.markdown',
        builtIn: true,
        sourcePackage: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
        options: { wikilinks: true },
      },
    ]);
  });

  it('registers tree-sitter without Markdown when Markdown is not enabled in workspace settings', () => {
    const harness = registry();

    registerDefaultIndexPlugins(
      harness.registry,
      { workspaceRoot: '/workspace' },
      {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        plugins: [{ id: 'codegraphy.python', enabled: true }],
      },
    );

    expect(harness.registered).toEqual([
      { id: 'codegraphy.treesitter', builtIn: true },
    ]);
  });

  it('registers tree-sitter without Markdown when Plugin Activity State disables Markdown', () => {
    const harness = registry();

    registerDefaultIndexPlugins(
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

    expect(harness.registered).toEqual([
      { id: 'codegraphy.treesitter', builtIn: true },
    ]);
  });

  it('does not register Markdown when a provided plugin already owns the Markdown id', () => {
    const harness = registry();
    const markdown = plugin('codegraphy.markdown');

    registerDefaultIndexPlugins(
      harness.registry,
      { workspaceRoot: '/workspace', plugins: [markdown] },
      {
        ...createDefaultCodeGraphyWorkspaceSettings(),
        plugins: [{ id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, enabled: true }],
      },
    );
    registerProvidedPlugins(harness.registry, [markdown, plugin('custom')]);

    expect(harness.registered.map(entry => entry.id)).toEqual([
      'codegraphy.treesitter',
      'codegraphy.markdown',
      'custom',
    ]);
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
