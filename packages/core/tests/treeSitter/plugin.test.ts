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
    })).toEqual(['import', 'call', 'inherit']);
    expect(plugin.contributeEdgeTypeCapabilities?.({
      filePaths: ['/workspace/src/app.py', '/workspace/src/view.tsx'],
    })).toEqual([
      'import',
      'call',
      'inherit',
      'type-import',
    ]);
  });

  it('declares call capability for supported source languages with callable imports', () => {
    const plugin = createTreeSitterPlugin();
    const supportedLanguageFiles = [
      '/workspace/src/main.c',
      '/workspace/src/app.cpp',
      '/workspace/src/Program.cs',
      '/workspace/lib/app.dart',
      '/workspace/src/Main.hs',
      '/workspace/src/App.java',
      '/workspace/src/app.js',
      '/workspace/src/Main.kt',
      '/workspace/src/main.lua',
      '/workspace/Sources/ViewController.m',
      '/workspace/src/Main.pas',
      '/workspace/src/App.php',
      '/workspace/src/app.py',
      '/workspace/lib/app.rb',
      '/workspace/src/main.rs',
      '/workspace/src/Main.scala',
      '/workspace/Sources/App.swift',
      '/workspace/src/app.ts',
      '/workspace/src/App.tsx',
    ];

    for (const filePath of supportedLanguageFiles) {
      expect(plugin.contributeEdgeTypeCapabilities?.({
        filePaths: [filePath],
      }), filePath).toContain('call');
    }
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
