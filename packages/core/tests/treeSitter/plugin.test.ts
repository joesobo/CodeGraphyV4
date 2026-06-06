import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTreeSitterPlugin } from '../../src/treeSitter/plugin';
import { analyzeFileWithTreeSitter } from '../../src/treeSitter/runtime/analyze';
import { preAnalyzeCSharpTreeSitterFiles } from '../../src/treeSitter/runtime/csharpIndex';
import { TREE_SITTER_SUPPORTED_EXTENSIONS } from '../../src/treeSitter/runtime/languages';

vi.mock('../../src/treeSitter/runtime/analyze', () => ({
  analyzeFileWithTreeSitter: vi.fn(),
}));

vi.mock('../../src/treeSitter/runtime/csharpIndex', async () => {
  const actual = await vi.importActual<object>(
    '../../src/treeSitter/runtime/csharpIndex',
  );
  return {
    ...actual,
    preAnalyzeCSharpTreeSitterFiles: vi.fn(),
  };
});

describe('core tree-sitter built-in plugin', () => {
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
    expect(plugin.fileColors).toBeUndefined();
    expect(plugin.contributeEdgeTypeCapabilities?.()).toEqual([
      'import',
      'reference',
      'call',
      'type-import',
      'inherit',
    ]);
    expect(plugin.contributeEdgeTypeCapabilities?.({
      filePaths: ['/workspace/src/app.py'],
    })).toEqual(['import', 'call']);
    expect(plugin.contributeEdgeTypeCapabilities?.({
      filePaths: ['/workspace/src/app.py', '/workspace/src/view.tsx'],
    })).toEqual([
      'import',
      'call',
      'type-import',
    ]);
    expect(plugin.contributeEdgeTypeCapabilities?.({
      filePaths: ['/workspace/src/app.cpp'],
    })).toEqual(['import', 'contains', 'inherit', 'overrides']);
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

  it('requests relation-only tree-sitter analysis when symbols are disabled', async () => {
    const plugin = createTreeSitterPlugin();
    const analysisResult = {
      filePath: '/workspace/src/app.ts',
      relations: [],
      symbols: [],
    };
    vi.mocked(analyzeFileWithTreeSitter).mockResolvedValue(analysisResult as never);

    await expect(
      plugin.analyzeFile?.(
        '/workspace/src/app.ts',
        'export const app = true;',
        '/workspace',
        {
          mode: 'workspace',
          fileSystem: {} as never,
          features: { symbols: false },
        },
      ),
    ).resolves.toBe(analysisResult);

    expect(analyzeFileWithTreeSitter).toHaveBeenCalledWith(
      '/workspace/src/app.ts',
      'export const app = true;',
      '/workspace',
      { includeSymbols: false },
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
