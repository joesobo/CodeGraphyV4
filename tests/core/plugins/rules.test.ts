import { describe, it, expect } from 'vitest';
import { createTypeScriptPlugin } from '../../../src/plugins/typescript';
import { createGDScriptPlugin } from '../../../src/plugins/godot';
import { createPythonPlugin } from '../../../src/plugins/python';
import { createCSharpPlugin } from '../../../src/plugins/csharp';
import { createMarkdownPlugin } from '../../../src/plugins/markdown';

describe('Plugin Rules', () => {
  it('TypeScript plugin declares rules', () => {
    const plugin = createTypeScriptPlugin();
    expect(plugin.rules).toBeDefined();
    expect(plugin.rules!.length).toBeGreaterThan(0);
    const ruleIds = plugin.rules!.map(r => r.id);
    expect(ruleIds).toContain('es6-import');
    expect(ruleIds).toContain('reexport');
    expect(ruleIds).toContain('dynamic-import');
    expect(ruleIds).toContain('commonjs-require');
    // Verify IRule shape
    for (const rule of plugin.rules!) {
      expect(rule).toHaveProperty('id');
      expect(rule).toHaveProperty('name');
      expect(rule).toHaveProperty('description');
      expect(typeof rule.id).toBe('string');
      expect(typeof rule.name).toBe('string');
      expect(typeof rule.description).toBe('string');
    }
  });

  it('GDScript plugin declares rules', () => {
    const plugin = createGDScriptPlugin();
    expect(plugin.rules).toBeDefined();
    const ruleIds = plugin.rules!.map(r => r.id);
    expect(ruleIds).toContain('preload');
    expect(ruleIds).toContain('load');
    expect(ruleIds).toContain('extends');
    expect(ruleIds).toContain('class-name-usage');
  });

  it('Python plugin declares rules', () => {
    const plugin = createPythonPlugin();
    expect(plugin.rules).toBeDefined();
    const ruleIds = plugin.rules!.map(r => r.id);
    expect(ruleIds).toContain('standard-import');
    expect(ruleIds).toContain('from-import');
  });

  it('C# plugin declares rules', () => {
    const plugin = createCSharpPlugin();
    expect(plugin.rules).toBeDefined();
    const ruleIds = plugin.rules!.map(r => r.id);
    expect(ruleIds).toContain('using-directive');
    expect(ruleIds).toContain('type-usage');
  });

  it('Markdown plugin declares rules', () => {
    const plugin = createMarkdownPlugin();
    expect(plugin.rules).toBeDefined();
    const ruleIds = plugin.rules!.map(r => r.id);
    expect(ruleIds).toContain('wikilink');
  });

  it('all plugins have unique rule IDs within their rules', () => {
    const plugins = [
      createTypeScriptPlugin(),
      createGDScriptPlugin(),
      createPythonPlugin(),
      createCSharpPlugin(),
      createMarkdownPlugin(),
    ];
    for (const plugin of plugins) {
      if (plugin.rules) {
        const ids = plugin.rules.map(r => r.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });
});
