import { describe, expect, it } from 'vitest';
import { createVuePlugin } from '../src/plugin';

describe('createVuePlugin', () => {
  it('exposes Vue SFC manifest metadata without default filters or custom graph types', () => {
    const plugin = createVuePlugin();

    expect(plugin).toMatchObject({
      id: 'codegraphy.vue',
      name: 'Vue',
      version: expect.any(String),
      apiVersion: expect.any(String),
      supportedExtensions: ['.vue'],
      defaultFilters: [],
      fileColors: {},
    });
    expect(plugin.contributeNodeTypes).toBeUndefined();
    expect(plugin.contributeEdgeTypes).toBeUndefined();
  });

  it('analyzes Vue SFC files', () => {
    const plugin = createVuePlugin();

    expect(plugin.analyzeFile).toEqual(expect.any(Function));
  });
});
