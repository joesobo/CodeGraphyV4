import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import { createNodeMap } from '../../../../../../src/webview/components/graph/runtime/physics/nodeLookup';

describe('webview/components/graph/runtime/physics/nodeLookup', () => {
  it('indexes graph nodes by id and keeps the original node objects', () => {
    const first = createNode('first');
    const second = createNode('second');

    const nodeMap = createNodeMap([first, second]);

    expect(nodeMap.get('first')).toBe(first);
    expect(nodeMap.get('second')).toBe(second);
    expect(nodeMap.has('missing')).toBe(false);
  });
});

function createNode(id: string): FGNode {
  return {
    id,
    label: id,
    size: 1,
    color: '#ffffff',
    borderColor: '#000000',
    borderWidth: 1,
    baseOpacity: 1,
    isFavorite: false,
    isPinned: false,
  } as FGNode;
}
