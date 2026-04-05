import { describe, it, expect } from 'vitest';
import { createTypeScriptPlugin } from '../../../../plugin-typescript/src';
import { createGDScriptPlugin } from '../../../../plugin-godot/src';
import { createPythonPlugin } from '../../../../plugin-python/src';
import { createCSharpPlugin } from '../../../../plugin-csharp/src';
import { createMarkdownPlugin } from '../../../../plugin-markdown/src';

describe('Plugin Rules', () => {
  it('TypeScript plugin declares sources', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.sources).toBeDefined();
    expect(plugin.sources!.length).toBeGreaterThan(0);
    const sourceIds = plugin.sources!.map(r => r.id);
    expect(sourceIds).toContain('es6-import');
    expect(sourceIds).toContain('reexport');
    expect(sourceIds).toContain('dynamic-import');
    expect(sourceIds).toContain('commonjs-require');
    // Verify IConnectionSource shape
    for (const rule of plugin.sources!) {
      expect(rule).toHaveProperty('id');
      expect(rule).toHaveProperty('name');
      expect(rule).toHaveProperty('description');
      expect(typeof rule.id).toBe('string');
      expect(typeof rule.name).toBe('string');
      expect(typeof rule.description).toBe('string');
    }
  });

  it('GDScript plugin declares sources', () => {
    const plugin = createGDScriptPlugin();
    expect(plugin.sources).toBeDefined();
    const sourceIds = plugin.sources!.map(r => r.id);
    expect(sourceIds).toContain('preload');
    expect(sourceIds).toContain('load');
    expect(sourceIds).toContain('extends');
    expect(sourceIds).toContain('class-name-usage');
  });

  it('Python plugin declares sources', () => {
    const plugin = createPythonPlugin();
    expect(plugin.sources).toBeDefined();
    const sourceIds = plugin.sources!.map(r => r.id);
    expect(sourceIds).toContain('import-module');
    expect(sourceIds).toContain('from-import-absolute');
    expect(sourceIds).toContain('from-import-relative');
  });

  it('C# plugin declares sources', () => {
    const plugin = createCSharpPlugin();
    expect(plugin.sources).toBeDefined();
    const sourceIds = plugin.sources!.map(r => r.id);
    expect(sourceIds).toContain('using-directive');
    expect(sourceIds).toContain('type-usage');
  });

  it('Markdown plugin declares sources', () => {
    const plugin = createMarkdownPlugin();
    expect(plugin.sources).toBeDefined();
    const sourceIds = plugin.sources!.map(r => r.id);
    expect(sourceIds).toContain('wikilink');
  });

  it('all plugins have unique rule IDs within their sources', () => {
    const plugins = [
      createTypeScriptPlugin(),
      createGDScriptPlugin(),
      createPythonPlugin(),
      createCSharpPlugin(),
      createMarkdownPlugin(),
    ];
    for (const plugin of plugins) {
      if (plugin.sources) {
        const ids = plugin.sources.map(r => r.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });
});
