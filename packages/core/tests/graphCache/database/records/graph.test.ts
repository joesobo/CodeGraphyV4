import { describe, expect, it } from 'vitest';
import {
  createSnapshotGraphEdge,
  createSnapshotGraphNode,
} from '../../../../src/graphCache/database/records/graph';

describe('graphCache/database/graph records', () => {
  it('hydrates a graph node from canonical columns and properties', () => {
    expect(createSnapshotGraphNode({
      id: 'src/app.ts',
      type: 'file',
      label: 'app.ts',
      propertiesJson: '{"color":"#fff","fileSize":42}',
    })).toEqual({
      id: 'src/app.ts',
      nodeType: 'file',
      label: 'app.ts',
      color: '#fff',
      fileSize: 42,
    });
  });

  it('hydrates a graph edge with properties and provenance', () => {
    expect(createSnapshotGraphEdge({
      id: 'a->b#import',
      sourceId: 'a',
      targetId: 'b',
      type: 'import',
      propertiesJson: '{"color":"#fff"}',
      provenanceJson: '[{"id":"plugin:import","pluginId":"plugin","sourceId":"import","label":"Import"}]',
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
    expect(createSnapshotGraphEdge({ sourceId: 'a', targetId: 'b', type: 'import' })).toBeUndefined();
  });
});
