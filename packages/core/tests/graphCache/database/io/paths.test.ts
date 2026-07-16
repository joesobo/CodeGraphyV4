import { describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import {
  clearDatabaseArtifacts,
  ensureDatabaseDirectory,
  getWorkspaceAnalysisDatabasePath,
} from '../../../../src/graphCache/database/io/paths';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
  };
});

describe('pipeline/database/cache/paths', () => {
  it('creates the database directory only when the workspace root exists', () => {
    const existsSync = vi.mocked(fs.existsSync);
    const mkdirSync = vi.mocked(fs.mkdirSync);

    existsSync.mockReturnValueOnce(false);
    ensureDatabaseDirectory('/missing');
    expect(mkdirSync).not.toHaveBeenCalled();

    existsSync.mockReturnValueOnce(true);
    ensureDatabaseDirectory('/workspace');
    expect(mkdirSync).toHaveBeenCalledWith('/workspace/.codegraphy', { recursive: true });
  });

  it('builds the repo-local analysis database path', () => {
    expect(getWorkspaceAnalysisDatabasePath('/workspace')).toBe('/workspace/.codegraphy/graph.sqlite');
  });

  it('clears the database and wal artifacts with best-effort error handling', () => {
    const rmSync = vi.mocked(fs.rmSync).mockImplementation((filePath: fs.PathLike) => {
      if (String(filePath).endsWith('-wal')) {
        throw new Error('locked');
      }
    });

    expect(() => clearDatabaseArtifacts('/workspace/.codegraphy/graph.sqlite')).not.toThrow();
    expect(rmSync).toHaveBeenNthCalledWith(1, '/workspace/.codegraphy/graph.sqlite', { force: true });
    expect(rmSync).toHaveBeenNthCalledWith(2, '/workspace/.codegraphy/graph.sqlite-wal', { force: true });
    expect(rmSync).toHaveBeenNthCalledWith(3, '/workspace/.codegraphy/graph.sqlite-shm', { force: true });
    expect(rmSync).toHaveBeenNthCalledWith(4, '/workspace/.codegraphy/graph.sqlite-journal', { force: true });
  });
});
