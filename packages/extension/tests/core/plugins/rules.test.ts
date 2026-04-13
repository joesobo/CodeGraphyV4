import { describe, it, expect } from 'vitest';
import { createTypeScriptPlugin } from '../../../../plugin-typescript/src/plugin';
import { createGDScriptPlugin } from '../../../../plugin-godot/src/plugin';
import { createPythonPlugin } from '../../../../plugin-python/src/plugin';
import { createCSharpPlugin } from '../../../../plugin-csharp/src/plugin';
import { createMarkdownPlugin } from '../../../../plugin-markdown/src/plugin';

describe('Plugin Rules', () => {
  it('TypeScript plugin relies on the core analyzer and does not declare supplemental sources', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.sources).toBeUndefined();
    expect(plugin.analyzeFile).toBeUndefined();
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

  it('Python plugin relies on the core analyzer and does not declare supplemental sources', () => {
    const plugin = createPythonPlugin();
    expect(plugin.sources).toBeUndefined();
    expect(plugin.analyzeFile).toBeUndefined();
  });

  it('C# plugin relies on the core analyzer and does not declare supplemental sources', () => {
    const plugin = createCSharpPlugin();
    expect(plugin.sources).toBeUndefined();
    expect(plugin.analyzeFile).toBeUndefined();
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
