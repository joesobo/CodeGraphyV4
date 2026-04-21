import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTreeSitterPlugin } from '../../../../src/extension/pipeline/plugins/treesitter/plugin';
import { analyzeFileWithTreeSitter } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze';
import { preAnalyzeCSharpTreeSitterFiles } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex';
import { TREE_SITTER_SUPPORTED_EXTENSIONS } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/languages';

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze', () => ({
  analyzeFileWithTreeSitter: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex', async () => {
  const actual = await vi.importActual<object>(
    '../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex',
  );
  return {
    ...actual,
    preAnalyzeCSharpTreeSitterFiles: vi.fn(),
  };
});

describe('extension/pipeline/plugins/treesitter/plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the tree-sitter plugin with metadata and supported extensions', () => {
    const plugin = createTreeSitterPlugin();

    expect(plugin.id).toBe('codegraphy.treesitter');
    expect(plugin.name).toBe('Tree-sitter');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.apiVersion).toBe('^2.0.0');
    expect(plugin.supportedExtensions).toEqual(TREE_SITTER_SUPPORTED_EXTENSIONS);
    expect(plugin.supportedExtensions).not.toBe(TREE_SITTER_SUPPORTED_EXTENSIONS);
    expect(plugin.fileColors).toMatchObject({
      '*.java': '#E76F00',
      '*.rs': '#DEA584',
      '*.go': '#00ADD8',
    });
  });

  it('returns analyzed file results when tree-sitter analysis succeeds', async () => {
    const plugin = createTreeSitterPlugin();
    const analysisResult = {
      filePath: '/workspace/src/app.ts',
      edgeTypes: ['import'],
      nodeTypes: ['function'],
      nodes: [{ id: 'node-1' }],
      relations: [{ from: 'a', to: 'b' }],
      symbols: [{ id: 'symbol-1' }],
    };
    vi.mocked(analyzeFileWithTreeSitter).mockResolvedValue(analysisResult as never);

    await expect(
      plugin.analyzeFile?.('/workspace/src/app.ts', 'export const app = true;', '/workspace'),
    ).resolves.toBe(analysisResult);
    expect(analyzeFileWithTreeSitter).toHaveBeenCalledWith(
      '/workspace/src/app.ts',
      'export const app = true;',
      '/workspace',
    );
  });

  it('falls back to an empty analysis result when tree-sitter returns null', async () => {
    const plugin = createTreeSitterPlugin();
    vi.mocked(analyzeFileWithTreeSitter).mockResolvedValue(null);

    await expect(
      plugin.analyzeFile?.('/workspace/src/app.ts', 'export const app = true;', '/workspace'),
    ).resolves.toEqual({
      filePath: '/workspace/src/app.ts',
      edgeTypes: [],
      nodeTypes: [],
      nodes: [],
      relations: [],
      symbols: [],
    });
  });

  it('delegates pre-analysis to the csharp pre-analysis helper', async () => {
    const plugin = createTreeSitterPlugin();
    const files = [
      { absolutePath: '/workspace/src/App.cs', content: 'class App {}' },
    ];

    await plugin.onPreAnalyze?.(files as never, '/workspace');

    expect(preAnalyzeCSharpTreeSitterFiles).toHaveBeenCalledWith(files, '/workspace');
  });
});
