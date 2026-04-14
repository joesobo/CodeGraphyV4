import { describe, expect, it } from 'vitest';
import { createCSharpPlugin } from '../src/plugin';

describe('createCSharpPlugin', () => {
  it('exposes manifest metadata', () => {
    const plugin = createCSharpPlugin();

    expect(plugin).toMatchObject({
      id: 'codegraphy.csharp',
      name: 'C#',
      version: expect.any(String),
      apiVersion: expect.any(String),
      supportedExtensions: ['.cs'],
    });
  });

  it('keeps C# ecosystem defaults from the manifest', () => {
    const plugin = createCSharpPlugin();

    expect(plugin.defaultFilters).toContain('**/bin/**');
    expect(plugin.defaultFilters).not.toContain('**/packages/**');
    expect(plugin.fileColors).toMatchObject({
      '*.cs': '#512BD4',
      '*.csproj': '#512BD4',
      '*.sln': '#854CC7',
    });
  });

  it('does not provide supplemental analysis once Tree-sitter owns C# parsing', () => {
    const plugin = createCSharpPlugin();

    expect(plugin.sources).toBeUndefined();
    expect(plugin.analyzeFile).toBeUndefined();
    expect(plugin.initialize).toBeUndefined();
    expect(plugin.onPreAnalyze).toBeUndefined();
    expect(plugin.onUnload).toBeUndefined();
  });
});
