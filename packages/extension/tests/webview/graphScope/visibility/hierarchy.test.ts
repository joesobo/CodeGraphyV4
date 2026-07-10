import { describe, expect, it } from 'vitest';

import { getParentNodeTypeUpdates } from '../../../../src/webview/components/graphScope/visibility/hierarchy';

const nodeTypes = [
  { id: 'symbol', label: 'Symbol', defaultColor: '#111', defaultVisible: false },
  {
    id: 'symbol:function',
    label: 'Function',
    defaultColor: '#222',
    defaultVisible: false,
    parentId: 'symbol',
  },
  {
    id: 'symbol:function:async',
    label: 'Async Function',
    defaultColor: '#333',
    defaultVisible: false,
    parentId: 'symbol:function',
  },
];

describe('webview/graphScope/visibility/hierarchy', () => {
  it('enables every defined ancestor of a node type', () => {
    expect(getParentNodeTypeUpdates(nodeTypes, 'symbol:function:async')).toEqual({
      symbol: true,
      'symbol:function': true,
    });
  });

  it('returns no parent updates for an unknown node type', () => {
    expect(getParentNodeTypeUpdates(nodeTypes, 'unknown')).toEqual({});
  });
});
