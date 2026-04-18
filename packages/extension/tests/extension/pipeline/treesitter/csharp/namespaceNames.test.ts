import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCSharpFileScopedNamespaceName,
  getResolvedNamespaceName,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeCSharp/namespaceNames';
import { getNodeText } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes';

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getNodeText: vi.fn((node?: { text?: string } | null) => node?.text ?? null),
}));

function createNode(overrides: Partial<{
  type: string;
  text: string;
  namedChildren: Array<{
    type: string;
    text?: string;
  }>;
  childForFieldName: (name: string) => { type: string; text?: string } | null;
}> = {}) {
  return {
    type: 'node',
    text: '',
    namedChildren: [],
    childForFieldName: () => null,
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyzeCSharp/namespaceNames', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers the declaration name field for file-scoped namespaces', () => {
    const rootNode = createNode({
      namedChildren: [
        createNode({
          type: 'file_scoped_namespace_declaration',
          childForFieldName: () => ({ type: 'qualified_name', text: 'CodeGraphy.Runtime' }),
          namedChildren: [{ type: 'identifier', text: 'ignored' }],
        }),
      ],
    });

    expect(getCSharpFileScopedNamespaceName(rootNode as never)).toBe('CodeGraphy.Runtime');
    expect(getNodeText).toHaveBeenCalledWith({ type: 'qualified_name', text: 'CodeGraphy.Runtime' });
  });

  it('falls back to matching named children and returns null when no file-scoped namespace exists', () => {
    const rootNode = createNode({
      namedChildren: [
        createNode({
          type: 'namespace_declaration',
          namedChildren: [{ type: 'identifier', text: 'ignored' }],
        }),
        createNode({
          type: 'file_scoped_namespace_declaration',
          namedChildren: [
            { type: 'attribute_list', text: 'ignored' },
            { type: 'alias_qualified_name', text: 'global::CodeGraphy.App' },
          ],
        }),
      ],
    });

    expect(getCSharpFileScopedNamespaceName(rootNode as never)).toBe('global::CodeGraphy.App');
    expect(getCSharpFileScopedNamespaceName(createNode() as never)).toBeNull();
  });

  it('uses the fallback namespace only when the current node does not resolve one', () => {
    const namespaceNode = createNode({
      namedChildren: [{ type: 'identifier', text: 'CodeGraphy.Commands' }],
    });

    expect(getResolvedNamespaceName(namespaceNode as never, 'Fallback.Namespace')).toBe(
      'CodeGraphy.Commands',
    );
    expect(getResolvedNamespaceName(createNode() as never, 'Fallback.Namespace')).toBe(
      'Fallback.Namespace',
    );
    expect(getResolvedNamespaceName(createNode() as never, null)).toBeNull();
  });
});
