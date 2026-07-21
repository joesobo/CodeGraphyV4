import { describe, expect, it } from 'vitest';
import { createSnapshotFileEntry } from '../../../../src/graphCache/database/records/file';

describe('graphCache/database/fileEntry', () => {
  it('creates a snapshot entry from explicit file columns', () => {
    expect(createSnapshotFileEntry({
      path: 'src/app.ts',
      analysisPath: '/workspace/src/app.ts',
      mtime: 42n,
      size: 7,
    })).toEqual({
      filePath: 'src/app.ts',
      mtime: 42,
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
      analysisPath: '/workspace/src/app.ts',
      size: -1,
    })).toEqual({
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
      analysisPath: '/workspace/src/app.ts',
    })).toBeUndefined();
    expect(createSnapshotFileEntry({
      path: 'src/app.ts',
    })).toBeUndefined();
  });
});
