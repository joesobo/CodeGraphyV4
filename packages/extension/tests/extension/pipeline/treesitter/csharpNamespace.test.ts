import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleCSharpNamespaceNode,
  handleCSharpUsingDirective,
} from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/csharp/namespace';
import { getResolvedNamespaceName } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/csharp/namespaceNames';
import { getNodeText } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes';

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/csharp/namespaceNames', () => ({
  getResolvedNamespaceName: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getNodeText: vi.fn((node?: { text?: string } | null) => node?.text ?? null),
}));

function createNode(overrides: Partial<{
  type: string;
  namedChildren: Array<{ type: string; text?: string }>;
}> = {}) {
  return {
    type: 'namespace_declaration',
    namedChildren: [],
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyze/csharp/namespace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips children for file-scoped namespace declarations', () => {
    const walk = vi.fn();

    expect(
      handleCSharpNamespaceNode(
        createNode({ type: 'file_scoped_namespace_declaration' }) as never,
        { currentNamespace: 'CodeGraphy' } as never,
        walk,
      ),
    ).toEqual({ skipChildren: true });
    expect(walk).not.toHaveBeenCalled();
    expect(getResolvedNamespaceName).not.toHaveBeenCalled();
  });

  it('walks named children with the resolved namespace for regular declarations', () => {
    vi.mocked(getResolvedNamespaceName).mockReturnValue('CodeGraphy.Runtime');
    const walk = vi.fn();
    const state = { currentNamespace: 'CodeGraphy' };
    const node = createNode({
      namedChildren: [{ type: 'class_declaration' }, { type: 'method_declaration' }],
    });

    expect(handleCSharpNamespaceNode(node as never, state as never, walk)).toEqual({
      skipChildren: true,
    });
    expect(getResolvedNamespaceName).toHaveBeenCalledWith(node, 'CodeGraphy');
    expect(walk).toHaveBeenNthCalledWith(
      1,
      node.namedChildren[0],
      expect.objectContaining({ currentNamespace: 'CodeGraphy.Runtime' }),
    );
    expect(walk).toHaveBeenNthCalledWith(
      2,
      node.namedChildren[1],
      expect.objectContaining({ currentNamespace: 'CodeGraphy.Runtime' }),
    );
  });

  it('adds non-empty using directive specifiers and skips empty ones', () => {
    const usingNamespaces = new Set<string>();

    handleCSharpUsingDirective(
      createNode({ namedChildren: [{ type: 'qualified_name', text: 'System.Linq' }] }) as never,
      usingNamespaces,
    );
    handleCSharpUsingDirective(createNode() as never, usingNamespaces);

    expect(getNodeText).toHaveBeenCalledWith({ type: 'qualified_name', text: 'System.Linq' });
    expect(getNodeText).toHaveBeenCalledWith(undefined);
    expect([...usingNamespaces]).toEqual(['System.Linq']);
  });
});
