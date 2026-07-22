import { describe, expect, it } from 'vitest';
import { createSveltePlugin } from '../src/plugin';

describe('createSveltePlugin', () => {
  it('exposes Svelte manifest metadata with generated app filters and no custom graph types', () => {
    const plugin = createSveltePlugin();

    expect(plugin).toMatchObject({
      id: 'codegraphy.svelte',
      name: 'Svelte',
      version: expect.any(String),
      apiVersion: expect.any(String),
      supportedExtensions: ['.svelte'],
      defaultFilters: ['**/.svelte-kit/**'],
    });
    expect(plugin.contributeNodeTypes).toBeUndefined();
    expect(plugin.contributeEdgeTypes).toBeUndefined();
    expect(plugin.contributeGraphScopeCapabilities?.()).toEqual({
      edgeTypes: ['import', 'type-import', 'call'],
    });
  });

  it('analyzes Svelte component files', () => {
    const plugin = createSveltePlugin();

    expect(plugin.analyzeFile).toEqual(expect.any(Function));
  });
});
