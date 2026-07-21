import * as fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readWorkspaceAnalysisDatabaseSnapshot } from '../../../src/graphCache/database/snapshot';
import * as connectionModule from '../../../src/graphCache/database/io/connection';
import * as pathModule from '../../../src/graphCache/database/io/paths';
import {
  EDGE_ROWS_QUERY,
  FILE_ROWS_QUERY,
  NODE_ROWS_QUERY,
  SYMBOL_ROWS_QUERY,
} from '../../../src/graphCache/database/query/read';

vi.mock('node:fs');
vi.mock('../../../src/graphCache/database/io/connection');
vi.mock('../../../src/graphCache/database/io/paths');

describe('graphCache/database/snapshot', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(pathModule.getWorkspaceAnalysisDatabasePath).mockReturnValue('/workspace/.codegraphy/graph.sqlite');
  });

  it('returns an empty snapshot when the database does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(readWorkspaceAnalysisDatabaseSnapshot('/workspace')).toEqual({
      files: [],
      graph: { nodes: [], edges: [] },
      symbols: [],
      relations: [],
    });
  });

  it('reads raw file facts and canonical graph records', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(connectionModule.withConnection).mockImplementation((_path, callback) => callback('connection' as never));
    vi.mocked(connectionModule.readRowsSync).mockImplementation((_connection, query) => {
      if (query === FILE_ROWS_QUERY) return [{
        path: 'src/app.ts',
        analysisPath: '/workspace/src/app.ts',
        mtime: 1,
        size: 2,
      }];
      if (query === NODE_ROWS_QUERY) return [
        {
          id: 1, key: 'src/app.ts', type: 'file', label: 'app.ts', filePath: 'src/app.ts', color: '#fff',
        },
        {
          id: 2, key: 'symbol-1', type: 'symbol', label: 'App', filePath: 'src/app.ts',
        },
      ];
      if (query === SYMBOL_ROWS_QUERY) return [{
        nodeId: 2,
        nodeKey: 'symbol-1',
        filePath: 'src/app.ts',
        analysisId: 'symbol-1',
        analysisPath: '/workspace/src/app.ts',
        name: 'App',
        kind: 'class',
        analysisOrder: 0,
      }];
      if (query === EDGE_ROWS_QUERY) return [];
      return [];
    });

    expect(readWorkspaceAnalysisDatabaseSnapshot('/workspace')).toMatchObject({
      files: [{ filePath: 'src/app.ts', mtime: 1, size: 2 }],
      graph: {
        nodes: [
          { id: 'src/app.ts', nodeType: 'file' },
          { id: 'symbol-1', nodeType: 'symbol' },
        ],
        edges: [],
      },
      symbols: [{ id: 'symbol-1', name: 'App' }],
      relations: [],
    });
  });

  it('warns and returns an empty snapshot when reading fails', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(connectionModule.withConnection).mockImplementation(() => { throw new Error('broken'); });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(readWorkspaceAnalysisDatabaseSnapshot('/workspace')).toEqual({
      files: [],
      graph: { nodes: [], edges: [] },
      symbols: [],
      relations: [],
    });
    expect(warn).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to read structured analysis snapshot.',
      expect.any(Error),
    );
  });
});
