import { describe, expect, it } from 'vitest';
import { createRunContext } from '../../../../../src/webview/components/graph/contextMenu/graphView/runContext';

describe('graphView run context', () => {
  it('keeps node selections out of selected edge ids even when an edge id is present', () => {
    expect(createRunContext(
      { kind: 'node' },
      { kind: 'node', targets: ['src/app.ts'], edgeId: 'not-an-edge' },
      false,
      [],
    )).toMatchObject({
      selectedNodeIds: ['src/app.ts'],
      selectedEdgeIds: [],
    });
  });

  it('omits selected edge ids when an edge selection has no edge id', () => {
    expect(createRunContext(
      { kind: 'edge' },
      { kind: 'edge', targets: ['source', 'target'] },
      false,
      [],
    )).toMatchObject({
      selectedNodeIds: [],
      selectedEdgeIds: [],
    });
  });
});
