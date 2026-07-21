import { describe, expect, it } from 'vitest';
import {
  createSnapshotGraphEdge,
  createSnapshotGraphNode,
} from '../../../../src/graphCache/database/records/graph';

describe('graphCache/database/graph records', () => {
  it('hydrates a graph node from explicit columns', () => {
    expect(createSnapshotGraphNode({
      key: 'src/app.ts',
      type: 'file',
      label: 'app.ts',
      color: '#fff',
      fileSize: 42,
    })).toEqual({
      id: 'src/app.ts',
      nodeType: 'file',
      label: 'app.ts',
      color: '#fff',
      fileSize: 42,
    });
  });

  it('hydrates a graph edge and one normalized source row', () => {
    expect(createSnapshotGraphEdge({
      key: 'physical-row',
      graphKey: 'a->b#import',
      sourceNodeKey: 'a',
      targetNodeKey: 'b',
      type: 'import',
      color: '#fff',
      sourceKey: 'plugin:import',
      sourcePluginId: 'plugin',
      pluginSourceId: 'import',
      sourceLabel: 'Import',
    })).toEqual({
      id: 'a->b#import',
      from: 'a',
      to: 'b',
      kind: 'import',
      color: '#fff',
      sources: [{ id: 'plugin:import', pluginId: 'plugin', sourceId: 'import', label: 'Import' }],
    });
  });

  it('drops records missing required identity columns', () => {
    expect(createSnapshotGraphNode({ type: 'file', label: 'app.ts' })).toBeUndefined();
    expect(createSnapshotGraphEdge({ sourceNodeKey: 'a', targetNodeKey: 'b', type: 'import' })).toBeUndefined();
  });
});
