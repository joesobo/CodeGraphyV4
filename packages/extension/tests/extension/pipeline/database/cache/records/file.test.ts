import { describe, expect, it } from 'vitest';
import { createSnapshotFileEntry } from '../../../../../../src/extension/pipeline/database/cache/records/file';

describe('extension/pipeline/database/cache/fileEntry', () => {
  it('creates a snapshot entry from valid persisted values', () => {
    expect(createSnapshotFileEntry({
      filePath: 'src/app.ts',
      mtime: 42n,
      size: 7,
      analysis: '{"filePath":"src/app.ts","symbols":[],"relations":[]}',
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
      filePath: 'src/app.ts',
      size: '7',
      analysis: '{"filePath":"src/app.ts","symbols":[],"relations":[]}',
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
      analysis: '{"filePath":"src/app.ts","symbols":[],"relations":[]}',
    })).toBeUndefined();

    expect(createSnapshotFileEntry({
      filePath: 'src/app.ts',
    })).toBeUndefined();
  });

  it('throws when persisted analysis JSON is malformed', () => {
    expect(() => createSnapshotFileEntry({
      filePath: 'src/app.ts',
      analysis: '{',
    })).toThrow(SyntaxError);
  });
});
