import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Parser from 'tree-sitter';
import { handleCSharpReferenceNode } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeCSharp/references';
import {
  getCSharpTypeName,
  resolveCSharpUsingImport,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeCSharp/resolution';
import { getIdentifierText } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes';
import { addReferenceRelation } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results';

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeCSharp/resolution', () => ({
  getCSharpTypeName: vi.fn(),
  resolveCSharpUsingImport: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results', () => ({
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
});
