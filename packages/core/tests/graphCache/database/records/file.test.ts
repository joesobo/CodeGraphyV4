import { describe, expect, it } from 'vitest';
import { createSnapshotFileEntry } from '../../../../src/graphCache/database/records/file';

describe('graphCache/database/fileEntry', () => {
  it('creates a snapshot entry from valid persisted values', () => {
    expect(createSnapshotFileEntry({
      path: 'src/app.ts',
      mtime: 42n,
      size: 7,
      analyzerStateJson: '{"filePath":"src/app.ts","symbols":[],"relations":[]}',
    })).toEqual({
      filePath: 'src/app.ts',
      mtime: 42,
      size: 7,
      analysis: {
        filePath: 'src/app.ts',
        symbols: [],
        relations: [],
      },
    });
  });

  it('defaults missing mtimes to zero and drops non-numeric sizes', () => {
    expect(createSnapshotFileEntry({
      path: 'src/app.ts',
      size: '7',
      analyzerStateJson: '{"filePath":"src/app.ts","symbols":[],"relations":[]}',
    })).toEqual({
      filePath: 'src/app.ts',
      mtime: 0,
      analysis: {
        filePath: 'src/app.ts',
        symbols: [],
        relations: [],
      },
    });
  });

  it('returns undefined when required persisted values are missing', () => {
    expect(createSnapshotFileEntry({
      analyzerStateJson: '{"filePath":"src/app.ts","symbols":[],"relations":[]}',
    })).toBeUndefined();

    expect(createSnapshotFileEntry({
      path: 'src/app.ts',
    })).toBeUndefined();
  });

  it('throws when persisted analysis JSON is malformed', () => {
    expect(() => createSnapshotFileEntry({
      path: 'src/app.ts',
      analyzerStateJson: '{',
    })).toThrow(SyntaxError);
  });
});
