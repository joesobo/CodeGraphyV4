import { describe, expect, it } from 'vitest';
import { EDGE_COLUMNS, FILE_COLUMNS, NODE_COLUMNS } from '../../../../src/graphCache/database/records/types';

describe('graphCache/database/record types', () => {
  it('defines explicit non-JSON columns for the three graph tables', () => {
    expect(FILE_COLUMNS).toContain('path');
    expect(NODE_COLUMNS).toContain('filePath');
    expect(EDGE_COLUMNS).toEqual(expect.arrayContaining(['sourceNodeId', 'targetNodeId']));
    expect([...FILE_COLUMNS, ...NODE_COLUMNS, ...EDGE_COLUMNS]
      .every(column => !column.endsWith('Json'))).toBe(true);
  });
});
