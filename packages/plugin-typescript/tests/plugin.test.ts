import { describe, expect, it } from 'vitest';
import { createTypeScriptPlugin } from '../src/plugin';

describe('createTypeScriptPlugin', () => {
  it('exposes manifest metadata', () => {
    const plugin = createTypeScriptPlugin();

    expect(plugin).toMatchObject({
      id: 'codegraphy.typescript',
      name: 'TypeScript/JavaScript',
      version: expect.any(String),
      apiVersion: expect.any(String),
      supportedExtensions: expect.arrayContaining(['.ts', '.tsx', '.js', '.jsx']),
    });
  });

  it('keeps TypeScript ecosystem filters', () => {
    const plugin = createTypeScriptPlugin();

    expect(plugin.defaultFilters).toContain('**/node_modules/**');
  });

  it('contributes a default-visible TypeScript Alias Import edge type', () => {
    const plugin = createTypeScriptPlugin();

    expect(plugin.contributeEdgeTypes?.()).toEqual([
      {
        id: 'codegraphy.typescript:alias-import',
        label: 'TypeScript Alias Import',
        defaultVisible: true,
        description: {
          description: 'Shows imports resolved through TypeScript path aliases instead of relative paths.',
          examples: [{ code: 'import { thing } from "@/module";' }],
        },
      },
    ]);
    expect(plugin.contributeGraphScopeCapabilities?.()).toEqual({
      edgeTypes: ['codegraphy.typescript:alias-import'],
    });
  });

  it('keeps plugin analysis focused on TypeScript alias imports', () => {
    const plugin = createTypeScriptPlugin();

    expect(plugin.sources).toBeUndefined();
    expect(plugin.analyzeFile).toEqual(expect.any(Function));
    expect(plugin.initialize).toBeUndefined();
    expect(plugin.onUnload).toBeUndefined();
  });
});
