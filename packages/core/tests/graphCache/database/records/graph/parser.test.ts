import { describe, expect, it } from 'vitest';
import {
  createSnapshotGraphEdge,
  createSnapshotGraphNode,
} from '../../../../../src/graphCache/database/records/graph/parser';

describe('graphCache/database/records/graph/parser', () => {
  it('hydrates a graph node from explicit columns', () => {
    expect(createSnapshotGraphNode({
      key: 'src/app.ts',
      type: 'file',
      label: 'app.ts',
    })).toEqual({
      id: 'src/app.ts',
      nodeType: 'file',
      label: 'app.ts',
    });
  });

  it('hydrates a graph edge from its referenced Nodes', () => {
    expect(createSnapshotGraphEdge({
      key: 'a->b#import',
      sourceNodeKey: 'a',
      targetNodeKey: 'b',
      type: 'import',
    })).toEqual({
      id: 'a->b#import',
      from: 'a',
      to: 'b',
      kind: 'import',
      sources: [],
    });
  });

  it('drops records missing required identity columns', () => {
    expect(createSnapshotGraphNode({ type: 'file', label: 'app.ts' })).toBeUndefined();
    expect(createSnapshotGraphEdge({ sourceNodeKey: 'a', targetNodeKey: 'b', type: 'import' })).toBeUndefined();
  });
});
