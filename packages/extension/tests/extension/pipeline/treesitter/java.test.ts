import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeJavaFile } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/java';

const {
  handleJavaImportDeclaration,
  handleJavaMethodDeclaration,
  handleJavaMethodInvocation,
  handleJavaTypeDeclaration,
  normalizeAnalysisResult,
  resolveJavaSourceInfo,
  walkTree,
} = vi.hoisted(() => ({
  handleJavaImportDeclaration: vi.fn(),
  handleJavaMethodDeclaration: vi.fn(),
  handleJavaMethodInvocation: vi.fn(),
  handleJavaTypeDeclaration: vi.fn(),
  normalizeAnalysisResult: vi.fn(),
  resolveJavaSourceInfo: vi.fn(),
  walkTree: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/javaHandlers', () => ({
  handleJavaImportDeclaration,
  handleJavaMethodDeclaration,
  handleJavaMethodInvocation,
  handleJavaTypeDeclaration,
  resolveJavaSourceInfo,
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results', () => ({
  normalizeAnalysisResult,
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/walk', () => ({
  walkTree,
}));

describe('pipeline/plugins/treesitter/runtime/analyze/java', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveJavaSourceInfo.mockReturnValue({ packageName: 'pkg', sourceRoot: '/workspace/src' });
    normalizeAnalysisResult.mockImplementation((filePath, symbols, relations) => ({
      filePath,
      symbols,
      relations,
    }));
  });

  it('routes Java nodes to the matching handlers', () => {
    let visit: ((node: unknown, state: unknown, walk: unknown) => unknown) | undefined;
    walkTree.mockImplementation((_root, _state, callback) => {
      visit = callback;
    });

    analyzeJavaFile('/workspace/src/App.java', { rootNode: {} } as never);

    const walk = vi.fn();
    const state = { currentSymbolId: 'symbol-id' };

    expect(visit?.({ type: 'import_declaration' }, state, walk)).toBeUndefined();
    expect(handleJavaImportDeclaration).toHaveBeenCalledWith(
      { type: 'import_declaration' },
      '/workspace/src/App.java',
      '/workspace/src',
      expect.any(Array),
      expect.any(Map),
    );

    visit?.({ type: 'class_declaration' }, state, walk);
    visit?.({ type: 'interface_declaration' }, state, walk);
    visit?.({ type: 'enum_declaration' }, state, walk);
    expect(handleJavaTypeDeclaration).toHaveBeenCalledTimes(3);

    visit?.({ type: 'method_declaration' }, state, walk);
    expect(handleJavaMethodDeclaration).toHaveBeenCalledWith(
      { type: 'method_declaration' },
      '/workspace/src/App.java',
      expect.any(Array),
      walk,
    );

    expect(visit?.({ type: 'method_invocation' }, state, walk)).toBeUndefined();
    expect(handleJavaMethodInvocation).toHaveBeenCalledWith(
      { type: 'method_invocation' },
      '/workspace/src/App.java',
      expect.any(Array),
      expect.any(Map),
      'symbol-id',
    );
  });

  it('ignores unknown Java node types and normalizes the collected result', () => {
    walkTree.mockImplementation((_root, _state, callback) => {
      expect(callback({ type: 'comment' }, {}, vi.fn())).toBeUndefined();
    });

    const result = analyzeJavaFile('/workspace/src/App.java', { rootNode: {} } as never);

    expect(handleJavaImportDeclaration).not.toHaveBeenCalled();
    expect(handleJavaMethodDeclaration).not.toHaveBeenCalled();
    expect(handleJavaMethodInvocation).not.toHaveBeenCalled();
    expect(handleJavaTypeDeclaration).not.toHaveBeenCalled();
    expect(resolveJavaSourceInfo).toHaveBeenCalledWith('/workspace/src/App.java', { rootNode: {} });
    expect(result).toEqual({
      filePath: '/workspace/src/App.java',
      symbols: [],
      relations: [],
    });
  });
});
