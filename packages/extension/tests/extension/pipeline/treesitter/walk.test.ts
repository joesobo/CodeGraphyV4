import { describe, expect, it, vi } from 'vitest';
import { walkSymbolBody, walkTree } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/walk';

function createNode(overrides: Partial<{
  type: string;
  namedChildren: unknown[];
  childForFieldName: (name: string) => unknown;
}> = {}) {
  return {
    type: 'node',
    namedChildren: [],
    childForFieldName: () => null,
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyze/walk', () => {
  it('recursively walks child nodes with the current or updated context', () => {
    const child = createNode({ type: 'child' });
    const grandchild = createNode({ type: 'grandchild' });
    const root = createNode({ type: 'root', namedChildren: [createNode({ type: 'middle', namedChildren: [grandchild] }), child] });
    const visits: string[] = [];

    walkTree(root as never, 'root-context', (node, context) => {
      visits.push(`${node.type}:${context}`);
      if (node.type === 'root') {
        return { nextContext: 'nested-context' };
      }

      return undefined;
    });

    expect(visits).toEqual([
      'root:root-context',
      'middle:nested-context',
      'grandchild:nested-context',
      'child:nested-context',
    ]);
  });

  it('skips children when the visitor requests it', () => {
    const visits: string[] = [];

    walkTree(
      createNode({ type: 'root', namedChildren: [createNode({ type: 'child' })] }) as never,
      null,
      (node) => {
        visits.push(node.type);
        return { skipChildren: true };
      },
    );

    expect(visits).toEqual(['root']);
  });

  it('walks symbol bodies through the body field or final named child', () => {
    const walk = vi.fn();
    const fieldBody = createNode({ type: 'block' });
    const fallbackBody = createNode({ type: 'fallback-block' });

    expect(
      walkSymbolBody(
        createNode({ childForFieldName: (name: string) => (name === 'body' ? fieldBody : null) }) as never,
        'symbol-id',
        walk,
      ),
    ).toEqual({ skipChildren: true });
    expect(
      walkSymbolBody(
        createNode({ namedChildren: [fallbackBody], childForFieldName: () => null }) as never,
        'symbol-id',
        walk,
      ),
    ).toEqual({ skipChildren: true });
    expect(
      walkSymbolBody(createNode() as never, 'symbol-id', walk),
    ).toEqual({ skipChildren: true });

    expect(walk).toHaveBeenCalledTimes(2);
    expect(walk).toHaveBeenNthCalledWith(1, fieldBody, { currentSymbolId: 'symbol-id' });
    expect(walk).toHaveBeenNthCalledWith(2, fallbackBody, { currentSymbolId: 'symbol-id' });
  });
});
