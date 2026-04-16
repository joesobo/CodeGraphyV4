import { describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import {
  clearDatabaseArtifacts,
  ensureDatabaseDirectory,
  getWorkspaceAnalysisDatabasePath,
} from '../../../../src/extension/pipeline/database/cachePaths';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
  };
});

describe('pipeline/database/cachePaths', () => {
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
    expect(getWorkspaceAnalysisDatabasePath('/workspace')).toBe('/workspace/.codegraphy/graph.lbug');
  });

  it('clears the database and wal artifacts with best-effort error handling', () => {
    const rmSync = vi.mocked(fs.rmSync).mockImplementation((filePath: fs.PathLike) => {
      if (String(filePath).endsWith('.wal')) {
        throw new Error('locked');
      }
    });

    expect(() => clearDatabaseArtifacts('/workspace/.codegraphy/graph.lbug')).not.toThrow();
    expect(rmSync).toHaveBeenNthCalledWith(1, '/workspace/.codegraphy/graph.lbug', { force: true });
    expect(rmSync).toHaveBeenNthCalledWith(2, '/workspace/.codegraphy/graph.lbug.wal', { force: true });
  });
});
