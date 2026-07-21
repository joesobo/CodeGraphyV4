import { describe, expect, it } from 'vitest';
import { createSnapshotFileEntry } from '../../../../src/graphCache/database/records/file';

describe('graphCache/database/fileEntry', () => {
  it('creates a snapshot entry from explicit file columns', () => {
    expect(createSnapshotFileEntry({
      path: 'src/app.ts',
      size: 7,
    }, '/workspace')).toEqual({
      filePath: 'src/app.ts',
      mtime: 0,
      size: 7,
      analysis: {
        filePath: '/workspace/src/app.ts',
        nodes: [],
        symbols: [],
        relations: [],
      },
    });
  });

  it('creates complete empty analysis collections for an unknown file size', () => {
    expect(createSnapshotFileEntry({
      path: 'src/app.ts',
      size: -1,
    }, '/workspace')).toEqual({
      filePath: 'src/app.ts',
      mtime: 0,
      analysis: {
        filePath: '/workspace/src/app.ts',
        nodes: [],
        symbols: [],
        relations: [],
      },
    });
  });

  it('returns undefined when required identity columns are missing', () => {
    expect(createSnapshotFileEntry({
      size: 1,
    }, '/workspace')).toBeUndefined();
  });
});
