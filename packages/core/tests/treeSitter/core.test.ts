import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  analyzeFileWithCoreTreeSitter,
  listCoreTreeSitterEdgeTypeCapabilities,
  listCoreTreeSitterGraphScopeCapabilities,
  preAnalyzeCoreTreeSitterFiles,
} from '../../src/treeSitter/core';
import { analyzeFileWithTreeSitter } from '../../src/treeSitter/runtime/analyze';
import { preAnalyzeCSharpTreeSitterFiles } from '../../src/treeSitter/runtime/csharpIndex';

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

describe('core tree-sitter baseline analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports core Tree-sitter edge capabilities without plugin metadata', () => {
    expect(listCoreTreeSitterEdgeTypeCapabilities()).toEqual([
      'import',
      'reference',
      'call',
      'type-import',
      'inherit',
    ]);
    expect(listCoreTreeSitterEdgeTypeCapabilities(['/workspace/src/app.py'])).toEqual([
      'import',
      'call',
      'inherit',
    ]);
    expect(listCoreTreeSitterEdgeTypeCapabilities([
      '/workspace/src/app.py',
      '/workspace/src/view.tsx',
    ])).toEqual([
      'import',
      'call',
      'inherit',
      'type-import',
      'contains',
    ]);
  });

  it('reports core Tree-sitter graph scope capabilities without plugin metadata', () => {
    expect(listCoreTreeSitterGraphScopeCapabilities(['/workspace/src/app.py'])).toEqual({
      nodeTypes: ['symbol:function', 'symbol:class'],
      edgeTypes: ['import', 'call', 'inherit'],
    });
    expect(listCoreTreeSitterGraphScopeCapabilities([
      '/workspace/src/app.py',
      '/workspace/src/view.tsx',
    ])).toEqual({
      nodeTypes: [
        'symbol:function',
        'symbol:class',
        'symbol:interface',
        'symbol:type',
        'symbol:enum',
        'symbol:constant',
      ],
      edgeTypes: [
        'import',
        'call',
        'inherit',
        'type-import',
        'contains',
      ],
    });
  });

  it('declares call capability for supported source languages with callable imports', () => {
    const supportedLanguageFiles = [
      '/workspace/src/app.cpp',
      '/workspace/src/App.java',
      '/workspace/src/app.js',
      '/workspace/src/app.py',
      '/workspace/src/main.rs',
      '/workspace/src/app.ts',
      '/workspace/src/App.tsx',
    ];

    for (const filePath of supportedLanguageFiles) {
      expect(listCoreTreeSitterEdgeTypeCapabilities([filePath]), filePath).toContain('call');
    }
  });

  it('returns analyzed file results when tree-sitter analysis succeeds', async () => {
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
      analyzeFileWithCoreTreeSitter('/workspace/src/app.ts', 'export const app = true;', '/workspace'),
    ).resolves.toBe(analysisResult);
    expect(analyzeFileWithTreeSitter).toHaveBeenCalledWith(
      '/workspace/src/app.ts',
      'export const app = true;',
      '/workspace',
    );
  });

  it('requests relation-only tree-sitter analysis when symbols are disabled', async () => {
    const analysisResult = {
      filePath: '/workspace/src/app.ts',
      relations: [],
      symbols: [],
    };
    vi.mocked(analyzeFileWithTreeSitter).mockResolvedValue(analysisResult as never);

    await expect(
      analyzeFileWithCoreTreeSitter(
        '/workspace/src/app.ts',
        'export const app = true;',
        '/workspace',
        {
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
    vi.mocked(analyzeFileWithTreeSitter).mockResolvedValue(null);

    await expect(
      analyzeFileWithCoreTreeSitter('/workspace/src/app.ts', 'export const app = true;', '/workspace'),
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
    const files = [
      { absolutePath: '/workspace/src/App.cs', content: 'class App {}' },
    ];

    await preAnalyzeCoreTreeSitterFiles(files as never, '/workspace');

    expect(preAnalyzeCSharpTreeSitterFiles).toHaveBeenCalledWith(files, '/workspace');
  });
});
