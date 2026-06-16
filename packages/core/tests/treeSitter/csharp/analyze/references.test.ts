import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Parser from 'tree-sitter';
import {
  collectCSharpUsingTargetNode,
  handleCSharpCallNode,
} from '../../../../src/treeSitter/runtime/analyzeCSharp/references';
import {
  getCSharpTypeName,
  resolveCSharpUsingImport,
} from '../../../../src/treeSitter/runtime/analyzeCSharp/resolution';
import { getIdentifierText } from '../../../../src/treeSitter/runtime/analyze/nodes';
import { addRelation } from '../../../../src/treeSitter/runtime/analyze/results';

vi.mock('../../../../src/treeSitter/runtime/analyzeCSharp/resolution', () => ({
  getCSharpTypeName: vi.fn(),
  resolveCSharpUsingImport: vi.fn(),
}));

vi.mock('../../../../src/treeSitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
}));

vi.mock('../../../../src/treeSitter/runtime/analyze/results', () => ({
  addRelation: vi.fn(),
}));

function createNode({
  type = 'identifier',
  fields = {},
  namedChildren = [],
  parent = null,
  text = '',
  descendantsByType = {},
}: {
  type?: string;
  fields?: Record<string, Parser.SyntaxNode | null | undefined>;
  namedChildren?: Parser.SyntaxNode[];
  parent?: Parser.SyntaxNode | null;
  text?: string;
  descendantsByType?: Record<string, Parser.SyntaxNode[]>;
} = {}): Parser.SyntaxNode {
  return {
    type,
    parent,
    text,
    namedChildren,
    childForFieldName(name: string) {
      return fields[name] ?? null;
    },
    descendantsOfType(types: string | string[]) {
      const requestedTypes = Array.isArray(types) ? types : [types];
      return requestedTypes.flatMap((requestedType) => descendantsByType[requestedType] ?? []);
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

  it('ignores syntax nodes that are not C# using target shapes', () => {
    collectCSharpUsingTargetNode(
      createNode({ type: 'identifier' }) as never,
      filePath,
      workspaceRoot,
      usingNamespaces,
      importTargetsByNamespace,
      'CodeGraphy.App',
    );

    expect(getIdentifierText).not.toHaveBeenCalled();
    expect(getCSharpTypeName).not.toHaveBeenCalled();
    expect(resolveCSharpUsingImport).not.toHaveBeenCalled();
    expect(addRelation).not.toHaveBeenCalled();
  });

  it('records uppercase member access expressions as using targets without adding graph relations', () => {
    const expressionNode = createNode({ type: 'identifier' });
    vi.mocked(getIdentifierText).mockReturnValue('DispatchStatus');
    vi.mocked(resolveCSharpUsingImport).mockReturnValue('/workspace/src/Models/DispatchStatus.cs');

    collectCSharpUsingTargetNode(
      createNode({
        type: 'member_access_expression',
        fields: { expression: expressionNode },
      }) as never,
      filePath,
      workspaceRoot,
      usingNamespaces,
      importTargetsByNamespace,
      'CodeGraphy.App',
    );

    expect(getIdentifierText).toHaveBeenCalledWith(expressionNode);
    expect(resolveCSharpUsingImport).toHaveBeenCalledWith(
      workspaceRoot,
      filePath,
      usingNamespaces,
      importTargetsByNamespace,
      'DispatchStatus',
      'CodeGraphy.App',
    );
    expect(addRelation).not.toHaveBeenCalled();
  });

  it('skips missing and lowercase member access using targets', () => {
    vi.mocked(getIdentifierText).mockReturnValueOnce(null).mockReturnValueOnce('service');

    collectCSharpUsingTargetNode(
      createNode({ type: 'member_access_expression' }) as never,
      filePath,
      workspaceRoot,
      usingNamespaces,
      importTargetsByNamespace,
      'CodeGraphy.App',
    );

    collectCSharpUsingTargetNode(
      createNode({ type: 'member_access_expression' }) as never,
      filePath,
      workspaceRoot,
      usingNamespaces,
      importTargetsByNamespace,
      'CodeGraphy.App',
    );

    expect(resolveCSharpUsingImport).not.toHaveBeenCalled();
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

    expect(addRelation).toHaveBeenNthCalledWith(
      1,
      relations,
      expect.objectContaining({
        kind: 'call',
        fromFilePath: filePath,
        fromSymbolId: '/workspace/src/App.cs:method:Run',
        resolvedPath: '/workspace/src/Services/ApiService.cs',
        specifier: 'ApiService',
        metadata: expect.objectContaining({
          importedName: 'ApiService',
          localName: 'ApiService',
        }),
      }),
    );
    expect(addRelation).toHaveBeenNthCalledWith(
      2,
      relations,
      expect.objectContaining({
        kind: 'call',
        fromFilePath: filePath,
        fromSymbolId: '/workspace/src/App.cs:method:Run',
        resolvedPath: '/workspace/src/Config.cs',
        specifier: 'Config',
        metadata: expect.objectContaining({
          importedName: 'Config',
          localName: 'Config',
          memberName: 'LoadConfig',
        }),
      }),
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

    expect(addRelation).toHaveBeenCalledWith(
      relations,
      expect.objectContaining({
        kind: 'call',
        fromFilePath: filePath,
        fromSymbolId: '/workspace/src/App.cs:method:Run',
        resolvedPath: '/workspace/src/Services/BaseService.cs',
        specifier: 'Status',
        metadata: expect.objectContaining({
          importedName: 'Status',
          localName: 'Status',
        }),
      }),
    );
  });

  it('records C# member calls through variables initialized by object creation', () => {
    const createdTypeNode = createNode({ type: 'identifier' });
    const creationNode = createNode({
      type: 'object_creation_expression',
      fields: { type: createdTypeNode },
    });
    const variableDeclarator = createNode({
      type: 'variable_declarator',
      fields: { name: createNode({ type: 'identifier' }) },
      descendantsByType: { object_creation_expression: [creationNode] },
    });
    const rootNode = createNode({
      type: 'compilation_unit',
      descendantsByType: { variable_declarator: [variableDeclarator] },
    });
    const invocationNode = createNode({
      type: 'invocation_expression',
      parent: rootNode,
      fields: {
        function: createNode({
          type: 'member_access_expression',
          fields: {
            expression: createNode({ type: 'identifier' }),
            name: createNode({ type: 'identifier' }),
          },
        }),
      },
    });
    vi.mocked(getIdentifierText)
      .mockReturnValueOnce('queue')
      .mockReturnValueOnce('Enqueue')
      .mockReturnValueOnce('queue');
    vi.mocked(getCSharpTypeName).mockReturnValueOnce('PriorityTaskQueue');
    vi.mocked(resolveCSharpUsingImport).mockReturnValue('/workspace/src/Services/PriorityTaskQueue.cs');

    handleCSharpCallNode(
      invocationNode as never,
      state as never,
      filePath,
      workspaceRoot,
      relations,
      usingNamespaces,
      importTargetsByNamespace,
    );

    expect(addRelation).toHaveBeenCalledWith(
      relations,
      expect.objectContaining({
        kind: 'call',
        fromFilePath: filePath,
        fromSymbolId: '/workspace/src/App.cs:method:Run',
        resolvedPath: '/workspace/src/Services/PriorityTaskQueue.cs',
        specifier: 'PriorityTaskQueue',
        metadata: expect.objectContaining({
          importedName: 'PriorityTaskQueue',
          localName: 'PriorityTaskQueue',
          memberName: 'Enqueue',
        }),
      }),
    );
  });
});
