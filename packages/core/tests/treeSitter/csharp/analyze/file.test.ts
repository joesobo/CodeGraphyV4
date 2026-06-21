import { beforeEach, describe, expect, it, vi } from 'vitest';

const csharpHarness = vi.hoisted(() => ({
  appendCSharpUsingImportRelations: vi.fn(),
  collectCSharpUsingTargetNode: vi.fn(),
  getCSharpFileScopedNamespaceName: vi.fn(() => 'MyApp'),
  handleCSharpCallNode: vi.fn(),
  handleCSharpConstructorDeclaration: vi.fn(),
  handleCSharpEventFieldDeclaration: vi.fn(),
  handleCSharpFieldDeclaration: vi.fn(),
  handleCSharpLocalDeclaration: vi.fn(),
  handleCSharpLocalFunctionDeclaration: vi.fn(),
  handleCSharpMethodDeclaration: vi.fn(),
  handleCSharpNamespaceNode: vi.fn(),
  handleCSharpParameter: vi.fn(),
  handleCSharpPropertyDeclaration: vi.fn(),
  handleCSharpTypeReferenceNode: vi.fn(),
  handleCSharpTypeDeclaration: vi.fn(),
  handleCSharpUsingDirective: vi.fn(),
  normalizeAnalysisResult: vi.fn(() => ({ filePath: '/workspace/App.cs', relations: [], symbols: [] })),
  walkTree: vi.fn(),
}));

vi.mock('../../../../src/treeSitter/runtime/analyzeCSharp/namespace', () => ({
  handleCSharpNamespaceNode: csharpHarness.handleCSharpNamespaceNode,
  handleCSharpUsingDirective: csharpHarness.handleCSharpUsingDirective,
}));

vi.mock(
  '../../../../src/treeSitter/runtime/analyzeCSharp/declarations',
  () => ({
    handleCSharpConstructorDeclaration: csharpHarness.handleCSharpConstructorDeclaration,
    handleCSharpEventFieldDeclaration: csharpHarness.handleCSharpEventFieldDeclaration,
    handleCSharpFieldDeclaration: csharpHarness.handleCSharpFieldDeclaration,
    handleCSharpLocalDeclaration: csharpHarness.handleCSharpLocalDeclaration,
    handleCSharpLocalFunctionDeclaration: csharpHarness.handleCSharpLocalFunctionDeclaration,
    handleCSharpMethodDeclaration: csharpHarness.handleCSharpMethodDeclaration,
    handleCSharpParameter: csharpHarness.handleCSharpParameter,
    handleCSharpPropertyDeclaration: csharpHarness.handleCSharpPropertyDeclaration,
    handleCSharpTypeDeclaration: csharpHarness.handleCSharpTypeDeclaration,
  }),
);

vi.mock(
  '../../../../src/treeSitter/runtime/analyzeCSharp/references',
  () => ({
    appendCSharpUsingImportRelations: csharpHarness.appendCSharpUsingImportRelations,
    collectCSharpUsingTargetNode: csharpHarness.collectCSharpUsingTargetNode,
    handleCSharpCallNode: csharpHarness.handleCSharpCallNode,
    handleCSharpTypeReferenceNode: csharpHarness.handleCSharpTypeReferenceNode,
  }),
);

vi.mock(
  '../../../../src/treeSitter/runtime/analyzeCSharp/namespaceNames',
  () => ({
    getCSharpFileScopedNamespaceName: csharpHarness.getCSharpFileScopedNamespaceName,
  }),
);

vi.mock('../../../../src/treeSitter/runtime/analyze/results', () => ({
  normalizeAnalysisResult: csharpHarness.normalizeAnalysisResult,
}));

vi.mock('../../../../src/treeSitter/runtime/analyze/walk', () => ({
  walkTree: csharpHarness.walkTree,
}));

import { analyzeCSharpFile } from '../../../../src/treeSitter/runtime/analyzeCSharp/file';

describe('pipeline/plugins/treesitter/runtime/analyzeCSharp/file', () => {
  beforeEach(() => {
    csharpHarness.appendCSharpUsingImportRelations.mockReset();
    csharpHarness.collectCSharpUsingTargetNode.mockReset();
    csharpHarness.getCSharpFileScopedNamespaceName.mockReset();
    csharpHarness.getCSharpFileScopedNamespaceName.mockReturnValue('MyApp');
    csharpHarness.handleCSharpCallNode.mockReset();
    csharpHarness.handleCSharpConstructorDeclaration.mockReset();
    csharpHarness.handleCSharpEventFieldDeclaration.mockReset();
    csharpHarness.handleCSharpFieldDeclaration.mockReset();
    csharpHarness.handleCSharpLocalDeclaration.mockReset();
    csharpHarness.handleCSharpLocalFunctionDeclaration.mockReset();
    csharpHarness.handleCSharpMethodDeclaration.mockReset();
    csharpHarness.handleCSharpNamespaceNode.mockReset();
    csharpHarness.handleCSharpParameter.mockReset();
    csharpHarness.handleCSharpPropertyDeclaration.mockReset();
    csharpHarness.handleCSharpTypeReferenceNode.mockReset();
    csharpHarness.handleCSharpTypeDeclaration.mockReset();
    csharpHarness.handleCSharpUsingDirective.mockReset();
    csharpHarness.normalizeAnalysisResult.mockReset();
    csharpHarness.normalizeAnalysisResult.mockReturnValue({
      filePath: '/workspace/App.cs',
      relations: [],
      symbols: [],
    });
    csharpHarness.walkTree.mockReset();
  });

  it('dispatches namespace nodes to the namespace handler and normalizes the final result', () => {
    const rootNode = { type: 'compilation_unit' };
    const tree = { rootNode };
    const namespaceNode = { type: 'namespace_declaration' };
    const fileScopedNamespaceNode = { type: 'file_scoped_namespace_declaration' };
    const walk = vi.fn();

    csharpHarness.walkTree.mockImplementation((_rootNode, state, visit) => {
      expect(state).toEqual({ currentNamespace: 'MyApp' });
      visit(namespaceNode, state, walk);
      visit(fileScopedNamespaceNode, state, walk);
    });

    const result = analyzeCSharpFile('/workspace/App.cs', tree as never, '/workspace');
    const normalizedCall = csharpHarness.normalizeAnalysisResult.mock.calls.at(0) as
      | unknown[]
      | undefined;
    const appendCall = csharpHarness.appendCSharpUsingImportRelations.mock.calls.at(0) as
      | unknown[]
      | undefined;

    expect(normalizedCall).toBeDefined();
    expect(appendCall).toBeDefined();
    const normalizedFilePath = normalizedCall![0] as string;
    const normalizedSymbols = normalizedCall![1] as unknown[];
    const normalizedRelations = normalizedCall![2] as unknown[];
    const appendWorkspaceRoot = appendCall![0] as string;
    const appendFilePath = appendCall![1] as string;
    const appendRelations = appendCall![2] as unknown[];
    const appendNamespaces = appendCall![3] as Set<string>;
    const appendTargets = appendCall![4] as Map<string, Set<string>>;

    expect(csharpHarness.getCSharpFileScopedNamespaceName).toHaveBeenCalledWith(rootNode);
    expect(csharpHarness.handleCSharpNamespaceNode).toHaveBeenNthCalledWith(
      1,
      namespaceNode,
      { currentNamespace: 'MyApp' },
      walk,
    );
    expect(csharpHarness.handleCSharpNamespaceNode).toHaveBeenNthCalledWith(
      2,
      fileScopedNamespaceNode,
      { currentNamespace: 'MyApp' },
      walk,
    );
    expect(appendWorkspaceRoot).toBe('/workspace');
    expect(appendFilePath).toBe('/workspace/App.cs');
    expect(appendRelations).toEqual([]);
    expect(appendNamespaces).toEqual(new Set());
    expect(appendTargets).toEqual(new Map());
    expect(normalizedFilePath).toBe('/workspace/App.cs');
    expect(normalizedSymbols).toEqual([]);
    expect(normalizedRelations).toEqual([]);
    expect(result).toEqual({
      filePath: '/workspace/App.cs',
      relations: [],
      symbols: [],
    });
  });

  it('routes using, type, method, and relation nodes to their matching handlers', () => {
    const tree = { rootNode: { type: 'compilation_unit' } };
    const state = { currentNamespace: 'MyApp' };
    const walk = vi.fn();
    const usingNode = { type: 'using_directive' };
    const classNode = { type: 'class_declaration' };
    const interfaceNode = { type: 'interface_declaration' };
    const structNode = { type: 'struct_declaration' };
    const enumNode = { type: 'enum_declaration' };
    const methodNode = { type: 'method_declaration' };
    const relationNode = { type: 'identifier' };

    csharpHarness.walkTree.mockImplementation((_rootNode, _initialState, visit) => {
      visit(usingNode, state, walk);
      visit(classNode, state, walk);
      visit(interfaceNode, state, walk);
      visit(structNode, state, walk);
      visit(enumNode, state, walk);
      visit(methodNode, state, walk);
      visit(relationNode, state, walk);
    });

    analyzeCSharpFile('/workspace/App.cs', tree as never, '/workspace');
    const normalizedCall = csharpHarness.normalizeAnalysisResult.mock.calls.at(0) as
      | unknown[]
      | undefined;

    expect(normalizedCall).toBeDefined();
    const normalizedFilePath = normalizedCall![0] as string;
    const normalizedSymbols = normalizedCall![1] as unknown[];
    const normalizedRelations = normalizedCall![2] as unknown[];

    expect(csharpHarness.handleCSharpUsingDirective).toHaveBeenCalledWith(
      usingNode,
      expect.any(Set),
    );
    expect(csharpHarness.handleCSharpTypeDeclaration).toHaveBeenCalledTimes(4);
    for (const node of [classNode, interfaceNode, structNode, enumNode]) {
      expect(csharpHarness.handleCSharpTypeDeclaration).toHaveBeenCalledWith(
        node,
        state,
        '/workspace/App.cs',
        '/workspace',
        expect.any(Array),
        expect.any(Array),
        expect.any(Set),
        expect.any(Map),
        true,
      );
    }
    expect(csharpHarness.handleCSharpMethodDeclaration).toHaveBeenCalledWith(
      methodNode,
      state,
      '/workspace/App.cs',
      expect.any(Array),
      walk,
    );
    expect(csharpHarness.handleCSharpTypeReferenceNode).toHaveBeenCalledWith(
      relationNode,
      '/workspace/App.cs',
      '/workspace',
      expect.any(Array),
      expect.any(Set),
      expect.any(Map),
      'MyApp',
    );
    expect(csharpHarness.handleCSharpCallNode).toHaveBeenCalledWith(
      relationNode,
      state,
      '/workspace/App.cs',
      '/workspace',
      expect.any(Array),
      expect.any(Set),
      expect.any(Map),
    );
    expect(csharpHarness.collectCSharpUsingTargetNode).toHaveBeenCalledWith(
      relationNode,
      '/workspace/App.cs',
      '/workspace',
      expect.any(Set),
      expect.any(Map),
      'MyApp',
    );
    expect(normalizedFilePath).toBe('/workspace/App.cs');
    expect(normalizedSymbols).toEqual([]);
    expect(normalizedRelations).toEqual([]);
  });
});
