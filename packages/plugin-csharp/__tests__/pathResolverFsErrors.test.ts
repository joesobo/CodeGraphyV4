import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
  readdirSync: vi.fn(),
}));

import * as fs from 'fs';
import { createResolverFsOps } from '../src/pathResolverFs';

describe('createResolverFsOps error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when file and directory stat checks throw', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockImplementation(() => {
      throw new Error('stat failed');
    });

    const fsOps = createResolverFsOps('/workspace');

    expect(fsOps.fileExists('src/Program.cs')).toBe(false);
    expect(fsOps.directoryExists('src')).toBe(false);
  });

  it('returns null when directory listing throws', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({
      isFile: () => false,
      isDirectory: () => true,
    } as unknown as fs.Stats);
    vi.mocked(fs.readdirSync).mockImplementation(() => {
      throw new Error('read failed');
    });

    const fsOps = createResolverFsOps('/workspace');

    expect(fsOps.findCsFileInDir('src')).toBeNull();
  });
});
