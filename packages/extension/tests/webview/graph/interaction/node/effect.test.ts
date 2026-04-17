import { describe, expect, it } from 'vitest';
import { buildNodeSingleClickInteractionEffect } from '../../../../../src/webview/components/graph/interaction/node/effect';

describe('graph/interaction/nodeSingleClickInteraction', () => {
  it('creates the node click interaction payload', () => {
    expect(
      buildNodeSingleClickInteractionEffect({
        clientX: 10,
        clientY: 20,
        ctrlKey: false,
        label: 'Node',
        metaKey: false,
        nodeId: 'node-a',
        now: 123,
        selectedNodeIds: [],
        shiftKey: false,
      }),
    ).toEqual({
      kind: 'sendInteraction',
      event: 'graph:nodeClick',
      payload: {
        node: { id: 'node-a', label: 'Node' },
        event: { x: 10, y: 20 },
      },
    });
  });
});
