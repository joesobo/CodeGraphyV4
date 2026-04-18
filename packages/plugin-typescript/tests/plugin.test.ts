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

  it('keeps TypeScript ecosystem defaults from the manifest', () => {
    const plugin = createTypeScriptPlugin();

    expect(plugin.defaultFilters).toContain('**/node_modules/**');
    expect(plugin.fileColors).toMatchObject({
      '*.ts': '#3178C6',
      '*.tsx': '#61DAFB',
      '*.js': '#F7DF1E',
    });
  });

  it('does not provide supplemental analysis once Tree-sitter owns the base JS/TS parsing', () => {
    const plugin = createTypeScriptPlugin();

    expect(plugin.sources).toBeUndefined();
    expect(plugin.analyzeFile).toBeUndefined();
    expect(plugin.initialize).toBeUndefined();
    expect(plugin.onLoad).toBeUndefined();
    expect(plugin.onUnload).toBeUndefined();
  });
});
