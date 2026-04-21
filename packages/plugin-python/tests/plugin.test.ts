import { describe, expect, it } from 'vitest';
import { createPythonPlugin } from '../src/plugin';

describe('createPythonPlugin', () => {
  it('exposes manifest metadata', () => {
    const plugin = createPythonPlugin();

    expect(plugin).toMatchObject({
      id: 'codegraphy.python',
      name: 'Python',
      version: expect.any(String),
      apiVersion: expect.any(String),
      supportedExtensions: expect.arrayContaining(['.py', '.pyi']),
    });
  });

  it('keeps Python ecosystem filters while leaving file theming to core Material defaults', () => {
    const plugin = createPythonPlugin();

    expect(plugin.defaultFilters).toContain('**/__pycache__/**');
    expect(plugin.fileColors).toEqual({});
  });

  it('does not provide supplemental analysis once Tree-sitter owns Python parsing', () => {
    const plugin = createPythonPlugin();

    expect(plugin.sources).toBeUndefined();
    expect(plugin.analyzeFile).toBeUndefined();
    expect(plugin.initialize).toBeUndefined();
    expect(plugin.onPreAnalyze).toBeUndefined();
    expect(plugin.onUnload).toBeUndefined();
  });
});
