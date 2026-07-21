import { describe, expect, it } from 'vitest';
import {
  EDGE_COLUMNS,
  FILE_COLUMNS,
  NODE_COLUMNS,
  SYMBOL_COLUMNS,
} from '../../../../src/graphCache/database/records/types';

describe('graphCache/database/record types', () => {
  it('defines explicit non-JSON columns for the normalized graph tables', () => {
    expect(FILE_COLUMNS).toContain('path');
    expect(NODE_COLUMNS).toContain('fileId');
    expect(SYMBOL_COLUMNS).toEqual(expect.arrayContaining(['nodeId', 'name', 'kind']));
    expect(EDGE_COLUMNS).toEqual(expect.arrayContaining(['sourceNodeId', 'targetNodeId']));
    expect([...FILE_COLUMNS, ...NODE_COLUMNS, ...SYMBOL_COLUMNS, ...EDGE_COLUMNS]
      .every(column => !column.endsWith('Json'))).toBe(true);
  });
});
