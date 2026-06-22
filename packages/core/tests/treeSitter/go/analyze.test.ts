import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeGoFile } from '../../../src/treeSitter/runtime/analyzeGo/file';

const {
  handleGoImportDeclaration,
  handleGoCallableDeclaration,
  handleGoTypeSpec,
  handleGoConstSpec,
  handleGoShortVarDeclaration,
  handleGoQualifiedTypeReference,
  handleGoCallExpression,
  normalizeAnalysisResult,
  walkTree,
} = vi.hoisted(() => ({
  handleGoImportDeclaration: vi.fn(),
  handleGoCallableDeclaration: vi.fn(),
  handleGoTypeSpec: vi.fn(),
  handleGoConstSpec: vi.fn(),
  handleGoShortVarDeclaration: vi.fn(),
  handleGoQualifiedTypeReference: vi.fn(),
  handleGoCallExpression: vi.fn(),
  normalizeAnalysisResult: vi.fn(),
  walkTree: vi.fn(),
}));

vi.mock('../../../src/treeSitter/runtime/analyzeGo/imports', () => ({
  handleGoImportDeclaration,
}));

vi.mock('../../../src/treeSitter/runtime/analyzeGo/handlers', () => ({
  handleGoCallableDeclaration,
  handleGoCallExpression,
  handleGoConstSpec,
  handleGoQualifiedTypeReference,
  handleGoShortVarDeclaration,
  handleGoTypeSpec,
}));

vi.mock('../../../src/treeSitter/runtime/analyze/results', () => ({
  normalizeAnalysisResult,
}));

vi.mock('../../../src/treeSitter/runtime/analyze/walk', () => ({
  walkTree,
}));

describe('pipeline/plugins/treesitter/runtime/analyzeGo/file', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    normalizeAnalysisResult.mockImplementation((filePath, symbols, relations) => ({
      filePath,
      symbols,
      relations,
    }));
  });

  it('routes Go node types to the matching handlers', () => {
    const rootNode = { type: 'source_file' };
    const filePath = '/workspace/main.go';
    const workspaceRoot = '/workspace';
    let visit: ((node: unknown, state: unknown, walk: unknown) => unknown) | undefined;
    walkTree.mockImplementation((_root, _state, callback) => {
      visit = callback;
    });

    analyzeGoFile(filePath, { rootNode } as never, workspaceRoot);

    const walk = vi.fn();
    const state = { currentSymbolId: 'symbol-id' };

    expect(visit?.({ type: 'import_declaration' }, state, walk)).toBeUndefined();
    expect(handleGoImportDeclaration).toHaveBeenCalledWith(
      { type: 'import_declaration' },
      filePath,
      workspaceRoot,
      expect.any(Array),
      expect.any(Map),
    );

    visit?.({ type: 'function_declaration' }, state, walk);
    visit?.({ type: 'method_declaration' }, state, walk);
    expect(handleGoCallableDeclaration).toHaveBeenNthCalledWith(
      1,
      { type: 'function_declaration' },
      filePath,
      expect.any(Array),
      walk,
    );
    expect(handleGoCallableDeclaration).toHaveBeenNthCalledWith(
      2,
      { type: 'method_declaration' },
      filePath,
      expect.any(Array),
      walk,
    );

    expect(visit?.({ type: 'type_spec' }, state, walk)).toBeUndefined();
    expect(handleGoTypeSpec).toHaveBeenCalledWith(
      { type: 'type_spec' },
      filePath,
      expect.any(Array),
      expect.any(Array),
      expect.any(Map),
    );

    expect(visit?.({ type: 'const_spec' }, state, walk)).toBeUndefined();
    expect(handleGoConstSpec).toHaveBeenCalledWith(
      { type: 'const_spec' },
      filePath,
      expect.any(Array),
    );

    expect(visit?.({ type: 'short_var_declaration' }, state, walk)).toBeUndefined();
    expect(handleGoShortVarDeclaration).toHaveBeenCalledWith(
      { type: 'short_var_declaration' },
      filePath,
      expect.any(Array),
    );

    expect(visit?.({ type: 'qualified_type' }, state, walk)).toBeUndefined();
    expect(handleGoQualifiedTypeReference).toHaveBeenCalledWith(
      { type: 'qualified_type' },
      filePath,
      expect.any(Array),
      expect.any(Map),
      'symbol-id',
    );

    expect(visit?.({ type: 'call_expression' }, state, walk)).toBeUndefined();
    expect(handleGoCallExpression).toHaveBeenCalledWith(
      { type: 'call_expression' },
      filePath,
      expect.any(Array),
      expect.any(Map),
      'symbol-id',
    );
  });

  it('ignores unknown Go node types and normalizes the collected result', () => {
    const rootNode = { type: 'source_file' };
    walkTree.mockImplementation((_root, _state, callback) => {
      expect(callback({ type: 'comment' }, {}, vi.fn())).toBeUndefined();
    });

    const result = analyzeGoFile('/workspace/main.go', { rootNode } as never, '/workspace');

    expect(handleGoImportDeclaration).not.toHaveBeenCalled();
    expect(handleGoCallableDeclaration).not.toHaveBeenCalled();
    expect(handleGoTypeSpec).not.toHaveBeenCalled();
    expect(handleGoConstSpec).not.toHaveBeenCalled();
    expect(handleGoShortVarDeclaration).not.toHaveBeenCalled();
    expect(handleGoQualifiedTypeReference).not.toHaveBeenCalled();
    expect(handleGoCallExpression).not.toHaveBeenCalled();
    expect(normalizeAnalysisResult).toHaveBeenCalledWith(
      '/workspace/main.go',
      expect.any(Array),
      expect.any(Array),
    );
    expect(result).toEqual({
      filePath: '/workspace/main.go',
      symbols: [],
      relations: [],
    });
  });
});
