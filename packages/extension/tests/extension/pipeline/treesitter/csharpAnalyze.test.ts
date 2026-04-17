import { beforeEach, describe, expect, it, vi } from 'vitest';

const csharpHarness = vi.hoisted(() => ({
  appendCSharpUsingImportRelations: vi.fn(),
  getCSharpFileScopedNamespaceName: vi.fn(() => 'MyApp'),
  handleCSharpMethodDeclaration: vi.fn(),
  handleCSharpNamespaceNode: vi.fn(),
  handleCSharpReferenceNode: vi.fn(),
  handleCSharpTypeDeclaration: vi.fn(),
  handleCSharpUsingDirective: vi.fn(),
  normalizeAnalysisResult: vi.fn(() => ({ filePath: '/workspace/App.cs', relations: [], symbols: [] })),
  walkTree: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeCSharp/namespace', () => ({
  handleCSharpNamespaceNode: csharpHarness.handleCSharpNamespaceNode,
  handleCSharpUsingDirective: csharpHarness.handleCSharpUsingDirective,
}));

vi.mock(
  '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeCSharp/declarations',
  () => ({
    handleCSharpMethodDeclaration: csharpHarness.handleCSharpMethodDeclaration,
    handleCSharpTypeDeclaration: csharpHarness.handleCSharpTypeDeclaration,
  }),
);

vi.mock(
  '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeCSharp/references',
  () => ({
    appendCSharpUsingImportRelations: csharpHarness.appendCSharpUsingImportRelations,
    handleCSharpReferenceNode: csharpHarness.handleCSharpReferenceNode,
  }),
);

vi.mock(
  '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeCSharp/namespaceNames',
  () => ({
    getCSharpFileScopedNamespaceName: csharpHarness.getCSharpFileScopedNamespaceName,
  }),
);

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results', () => ({
  normalizeAnalysisResult: csharpHarness.normalizeAnalysisResult,
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/walk', () => ({
  walkTree: csharpHarness.walkTree,
}));

import { analyzeCSharpFile } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeCSharp/file';

describe('pipeline/plugins/treesitter/runtime/analyzeCSharp/file', () => {
  beforeEach(() => {
    csharpHarness.appendCSharpUsingImportRelations.mockReset();
    csharpHarness.getCSharpFileScopedNamespaceName.mockReset();
    csharpHarness.getCSharpFileScopedNamespaceName.mockReturnValue('MyApp');
    csharpHarness.handleCSharpMethodDeclaration.mockReset();
    csharpHarness.handleCSharpNamespaceNode.mockReset();
    csharpHarness.handleCSharpReferenceNode.mockReset();
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

  it('routes using, type, method, and reference nodes to their matching handlers', () => {
    const tree = { rootNode: { type: 'compilation_unit' } };
    const state = { currentNamespace: 'MyApp' };
    const walk = vi.fn();
    const usingNode = { type: 'using_directive' };
    const classNode = { type: 'class_declaration' };
    const interfaceNode = { type: 'interface_declaration' };
    const structNode = { type: 'struct_declaration' };
    const enumNode = { type: 'enum_declaration' };
    const methodNode = { type: 'method_declaration' };
    const referenceNode = { type: 'identifier' };

    csharpHarness.walkTree.mockImplementation((_rootNode, _initialState, visit) => {
      visit(usingNode, state, walk);
      visit(classNode, state, walk);
      visit(interfaceNode, state, walk);
      visit(structNode, state, walk);
      visit(enumNode, state, walk);
      visit(methodNode, state, walk);
      visit(referenceNode, state, walk);
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
      );
    }
    expect(csharpHarness.handleCSharpMethodDeclaration).toHaveBeenCalledWith(
      methodNode,
      state,
      '/workspace/App.cs',
      expect.any(Array),
      walk,
    );
    expect(csharpHarness.handleCSharpReferenceNode).toHaveBeenCalledWith(
      referenceNode,
      state,
      '/workspace/App.cs',
      '/workspace',
      expect.any(Array),
      expect.any(Set),
      expect.any(Map),
    );
    expect(normalizedFilePath).toBe('/workspace/App.cs');
    expect(normalizedSymbols).toEqual([]);
    expect(normalizedRelations).toEqual([]);
  });
});
