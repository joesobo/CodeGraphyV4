import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Parser from 'tree-sitter';
import {
  handleJavaMethodDeclaration,
  handleJavaMethodInvocation,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeJava/methods';
import type { ImportedBinding } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/model';
import { getIdentifierText } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes';
import { addCallRelation, createSymbol } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results';
import { walkSymbolBody } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/walk';

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results', () => ({
  addCallRelation: vi.fn(),
  createSymbol: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/walk', () => ({
  walkSymbolBody: vi.fn(),
}));

function createNode({
  type = 'method_declaration',
  fields = {},
}: {
  type?: string;
  fields?: Record<string, Parser.SyntaxNode | null | undefined>;
} = {}): Parser.SyntaxNode {
  return {
    type,
    childForFieldName(name: string) {
      return fields[name] ?? null;
    },
  } as unknown as Parser.SyntaxNode;
}

describe('pipeline/plugins/treesitter/runtime/analyzeJava/methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates method symbols and walks the method body when a Java method has a name', () => {
    const childForFieldName = vi.fn((name: string) =>
      name === 'name' ? createNode({ type: 'identifier' }) : null,
    );
    const node = createNode({
      fields: {},
    });
    node.childForFieldName = childForFieldName as Parser.SyntaxNode['childForFieldName'];
    const symbol = { id: '/workspace/App.java:method:run' };
    const symbols: never[] = [];
    const walk = vi.fn();

    vi.mocked(getIdentifierText).mockReturnValue('run');
    vi.mocked(createSymbol).mockReturnValue(symbol as never);
    vi.mocked(walkSymbolBody).mockReturnValue({ skipChildren: true } as never);

    expect(handleJavaMethodDeclaration(
      node,
      '/workspace/App.java',
      symbols,
      walk,
    )).toEqual({ skipChildren: true });

    expect(childForFieldName).toHaveBeenCalledWith('name');
    expect(createSymbol).toHaveBeenCalledWith('/workspace/App.java', 'method', 'run', node);
    expect(symbols).toEqual([symbol]);
    expect(walkSymbolBody).toHaveBeenCalledWith(node, '/workspace/App.java:method:run', walk);
  });

  it('skips unnamed Java method declarations', () => {
    const childForFieldName = vi.fn(() => null);
    const symbols: never[] = [];
    const node = createNode();
    node.childForFieldName = childForFieldName as Parser.SyntaxNode['childForFieldName'];

    vi.mocked(getIdentifierText).mockReturnValue(null);

    expect(handleJavaMethodDeclaration(
      node,
      '/workspace/App.java',
      symbols,
      vi.fn(),
    )).toBeUndefined();

    expect(childForFieldName).toHaveBeenCalledWith('name');
    expect(createSymbol).not.toHaveBeenCalled();
    expect(symbols).toEqual([]);
    expect(walkSymbolBody).not.toHaveBeenCalled();
  });

  it('adds Java call relations only when the invocation object resolves to an imported binding', () => {
    const relations: never[] = [];
    const importedBindings = new Map<string, ImportedBinding>([
      ['service', { specifier: './service', resolvedPath: '/workspace/service.ts' }],
    ]);
    const objectNode = createNode({ type: 'identifier' });
    const childForFieldName = vi.fn((name: string) =>
      name === 'object' ? objectNode : null,
    );
    const invocationNode = createNode();
    invocationNode.childForFieldName = childForFieldName as Parser.SyntaxNode['childForFieldName'];

    vi.mocked(getIdentifierText)
      .mockReturnValueOnce('service')
      .mockReturnValueOnce('missing')
      .mockReturnValueOnce(null);

    handleJavaMethodInvocation(
      invocationNode,
      '/workspace/App.java',
      relations,
      importedBindings,
      '/workspace/App.java:method:run',
    );
    handleJavaMethodInvocation(
      invocationNode,
      '/workspace/App.java',
      relations,
      importedBindings,
    );
    handleJavaMethodInvocation(
      invocationNode,
      '/workspace/App.java',
      relations,
      importedBindings,
    );

    expect(childForFieldName).toHaveBeenCalledWith('object');
    expect(getIdentifierText).toHaveBeenCalledWith(objectNode);
    expect(addCallRelation).toHaveBeenCalledTimes(1);
    expect(addCallRelation).toHaveBeenCalledWith(
      relations,
      '/workspace/App.java',
      { specifier: './service', resolvedPath: '/workspace/service.ts' },
      '/workspace/App.java:method:run',
    );
  });
});
