import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Parser from 'tree-sitter';
import {
  handleCSharpCallNode,
  handleCSharpReferenceNode,
} from '../../../src/treeSitter/runtime/analyzeCSharp/references';
import {
  getCSharpTypeName,
  resolveCSharpUsingImport,
} from '../../../src/treeSitter/runtime/analyzeCSharp/resolution';
import { getIdentifierText } from '../../../src/treeSitter/runtime/analyze/nodes';
import { addCallRelation, addReferenceRelation } from '../../../src/treeSitter/runtime/analyze/results';

vi.mock('../../../src/treeSitter/runtime/analyzeCSharp/resolution', () => ({
  getCSharpTypeName: vi.fn(),
  resolveCSharpUsingImport: vi.fn(),
}));

vi.mock('../../../src/treeSitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
}));

vi.mock('../../../src/treeSitter/runtime/analyze/results', () => ({
  addCallRelation: vi.fn(),
  addReferenceRelation: vi.fn(),
}));

function createNode({
  type = 'identifier',
  fields = {},
  namedChildren = [],
}: {
  type?: string;
  fields?: Record<string, Parser.SyntaxNode | null | undefined>;
  namedChildren?: Parser.SyntaxNode[];
} = {}): Parser.SyntaxNode {
  return {
    type,
    namedChildren,
    childForFieldName(name: string) {
      return fields[name] ?? null;
    },
  } as unknown as Parser.SyntaxNode;
}

describe('pipeline/plugins/treesitter/runtime/analyzeCSharp/references', () => {
  const state = {
    currentNamespace: 'CodeGraphy.App',
    currentSymbolId: '/workspace/src/App.cs:method:Run',
  };
  const filePath = '/workspace/src/App.cs';
  const workspaceRoot = '/workspace';
  const relations: never[] = [];
  const usingNamespaces = new Set(['CodeGraphy.Models']);
  const importTargetsByNamespace = new Map<string, Set<string>>();

  beforeEach(() => {
    vi.clearAllMocks();
    relations.length = 0;
    importTargetsByNamespace.clear();
  });

  it('ignores syntax nodes that are not supported C# reference shapes', () => {
    handleCSharpReferenceNode(
      createNode({ type: 'identifier' }) as never,
      state as never,
      filePath,
      workspaceRoot,
      relations,
      usingNamespaces,
      importTargetsByNamespace,
    );

    expect(getIdentifierText).not.toHaveBeenCalled();
    expect(getCSharpTypeName).not.toHaveBeenCalled();
    expect(resolveCSharpUsingImport).not.toHaveBeenCalled();
    expect(addReferenceRelation).not.toHaveBeenCalled();
  });

  it('reads member access references from the expression field and records resolved uppercase types', () => {
    const expressionNode = createNode({ type: 'identifier' });
    vi.mocked(getIdentifierText).mockReturnValue('User');
    vi.mocked(resolveCSharpUsingImport).mockReturnValue('/workspace/src/Models/User.cs');

    handleCSharpReferenceNode(
      createNode({
        type: 'member_access_expression',
        fields: { expression: expressionNode },
      }) as never,
      state as never,
      filePath,
      workspaceRoot,
      relations,
      usingNamespaces,
      importTargetsByNamespace,
    );

    expect(getIdentifierText).toHaveBeenCalledWith(expressionNode);
    expect(resolveCSharpUsingImport).toHaveBeenCalledWith(
      workspaceRoot,
      filePath,
      usingNamespaces,
      importTargetsByNamespace,
      'User',
      'CodeGraphy.App',
    );
    expect(addReferenceRelation).toHaveBeenCalledWith(
      relations,
      filePath,
      'User',
      '/workspace/src/Models/User.cs',
      '/workspace/src/App.cs:method:Run',
    );
  });

  it('falls back to the first named child for member access expressions without an expression field', () => {
    const fallbackExpression = createNode({ type: 'identifier' });
    vi.mocked(getIdentifierText).mockReturnValue('Worker');
    vi.mocked(resolveCSharpUsingImport).mockReturnValue('/workspace/src/Services/Worker.cs');

    handleCSharpReferenceNode(
      createNode({
        type: 'member_access_expression',
        namedChildren: [fallbackExpression],
      }) as never,
      state as never,
      filePath,
      workspaceRoot,
      relations,
      usingNamespaces,
      importTargetsByNamespace,
    );

    expect(getIdentifierText).toHaveBeenCalledWith(fallbackExpression);
    expect(addReferenceRelation).toHaveBeenCalledWith(
      relations,
      filePath,
      'Worker',
      '/workspace/src/Services/Worker.cs',
      '/workspace/src/App.cs:method:Run',
    );
  });

  it('reads object creation references from the type field', () => {
    const typeNode = createNode({ type: 'identifier' });
    vi.mocked(getCSharpTypeName).mockReturnValue('Repository');
    vi.mocked(resolveCSharpUsingImport).mockReturnValue('/workspace/src/Data/Repository.cs');

    handleCSharpReferenceNode(
      createNode({
        type: 'object_creation_expression',
        fields: { type: typeNode },
      }) as never,
      state as never,
      filePath,
      workspaceRoot,
      relations,
      usingNamespaces,
      importTargetsByNamespace,
    );

    expect(getCSharpTypeName).toHaveBeenCalledWith(typeNode);
    expect(getIdentifierText).not.toHaveBeenCalled();
    expect(addReferenceRelation).toHaveBeenCalledWith(
      relations,
      filePath,
      'Repository',
      '/workspace/src/Data/Repository.cs',
      '/workspace/src/App.cs:method:Run',
    );
  });

  it('skips missing, lowercase, and unresolved C# type references', () => {
    vi.mocked(getIdentifierText).mockReturnValueOnce(null).mockReturnValueOnce('service');
    vi.mocked(getCSharpTypeName).mockReturnValueOnce('helper');
    vi.mocked(resolveCSharpUsingImport).mockReturnValue(null);

    handleCSharpReferenceNode(
      createNode({ type: 'member_access_expression' }) as never,
      state as never,
      filePath,
      workspaceRoot,
      relations,
      usingNamespaces,
      importTargetsByNamespace,
    );

    handleCSharpReferenceNode(
      createNode({ type: 'member_access_expression' }) as never,
      state as never,
      filePath,
      workspaceRoot,
      relations,
      usingNamespaces,
      importTargetsByNamespace,
    );

    handleCSharpReferenceNode(
      createNode({ type: 'object_creation_expression' }) as never,
      state as never,
      filePath,
      workspaceRoot,
      relations,
      usingNamespaces,
      importTargetsByNamespace,
    );

    vi.mocked(getIdentifierText).mockReturnValue('Service');
    handleCSharpReferenceNode(
      createNode({ type: 'member_access_expression' }) as never,
      state as never,
      filePath,
      workspaceRoot,
      relations,
      usingNamespaces,
      importTargetsByNamespace,
    );

    expect(resolveCSharpUsingImport).toHaveBeenCalledTimes(1);
    expect(addReferenceRelation).not.toHaveBeenCalled();
  });

  it('records C# calls to resolved object creation and static member targets', () => {
    const objectTypeNode = createNode({ type: 'identifier' });
    const staticTypeNode = createNode({ type: 'identifier' });
    vi.mocked(getCSharpTypeName).mockReturnValueOnce('ApiService');
    vi.mocked(getIdentifierText)
      .mockReturnValueOnce('Config')
      .mockReturnValueOnce('LoadConfig');
    vi.mocked(resolveCSharpUsingImport)
      .mockReturnValueOnce('/workspace/src/Services/ApiService.cs')
      .mockReturnValueOnce('/workspace/src/Config.cs');

    handleCSharpCallNode(
      createNode({
        type: 'object_creation_expression',
        fields: { type: objectTypeNode },
      }) as never,
      state as never,
      filePath,
      workspaceRoot,
      relations,
      usingNamespaces,
      importTargetsByNamespace,
    );
    handleCSharpCallNode(
      createNode({
        type: 'invocation_expression',
        fields: {
          function: createNode({
            type: 'member_access_expression',
            fields: { expression: staticTypeNode },
            namedChildren: [staticTypeNode, createNode({ type: 'identifier' })],
          }),
        },
      }) as never,
      state as never,
      filePath,
      workspaceRoot,
      relations,
      usingNamespaces,
      importTargetsByNamespace,
    );

    expect(addCallRelation).toHaveBeenNthCalledWith(
      1,
      relations,
      filePath,
      expect.objectContaining({
        importedName: 'ApiService',
        localName: 'ApiService',
        resolvedPath: '/workspace/src/Services/ApiService.cs',
        specifier: 'ApiService',
      }),
      '/workspace/src/App.cs:method:Run',
    );
    expect(addCallRelation).toHaveBeenNthCalledWith(
      2,
      relations,
      filePath,
      expect.objectContaining({
        importedName: 'Config',
        localName: 'Config',
        memberName: 'LoadConfig',
        resolvedPath: '/workspace/src/Config.cs',
        specifier: 'Config',
      }),
      '/workspace/src/App.cs:method:Run',
    );
  });

  it('records C# calls to inherited methods when the containing type has one resolved base type', () => {
    vi.mocked(getIdentifierText).mockReturnValueOnce('Status');

    handleCSharpCallNode(
      createNode({
        type: 'invocation_expression',
        fields: {
          function: createNode({ type: 'identifier' }),
        },
      }) as never,
      {
        ...state,
        currentBaseTypePaths: ['/workspace/src/Services/BaseService.cs'],
      },
      filePath,
      workspaceRoot,
      relations,
      usingNamespaces,
      importTargetsByNamespace,
    );

    expect(addCallRelation).toHaveBeenCalledWith(
      relations,
      filePath,
      expect.objectContaining({
        importedName: 'Status',
        localName: 'Status',
        resolvedPath: '/workspace/src/Services/BaseService.cs',
        specifier: 'Status',
      }),
      '/workspace/src/App.cs:method:Run',
    );
  });
});
