import { describe, expect, it } from 'vitest';
import {
  EDGE_COLUMNS,
  FILE_COLUMNS,
  NODE_COLUMNS,
  NODE_VIEW_COLUMNS,
  SYMBOL_COLUMNS,
} from '../../../../src/graphCache/database/records/types';

describe('graphCache/database/record types', () => {
  it('defines explicit non-JSON columns for the normalized graph tables', () => {
    expect(FILE_COLUMNS).toEqual(['path', 'size', 'contentHash']);
    expect(NODE_COLUMNS).toEqual([
      'key', 'type', 'label', 'fileId', 'parentId', 'pluginId', 'language',
    ]);
    expect(NODE_VIEW_COLUMNS).toEqual([
      'nodeKey', 'color', 'x', 'y', 'favorite', 'shape', 'imageUrl', 'isCollapsed',
    ]);
    expect(SYMBOL_COLUMNS).toEqual(['nodeId', 'name', 'kind', 'pluginId', 'language']);
    expect(EDGE_COLUMNS).toEqual(['key', 'sourceNodeId', 'targetNodeId', 'type']);
    expect([...FILE_COLUMNS, ...NODE_COLUMNS, ...NODE_VIEW_COLUMNS, ...SYMBOL_COLUMNS, ...EDGE_COLUMNS]
      .every(column => !column.endsWith('Json'))).toBe(true);
  });
});
