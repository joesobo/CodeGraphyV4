import * as fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readWorkspaceAnalysisDatabaseGraph,
  readWorkspaceAnalysisDatabaseSnapshot,
} from '../../../src/graphCache/database/snapshot';
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
    vi.mocked(connectionModule.withReadOnlyConnection).mockImplementation(
      (_path, callback) => callback('connection' as never),
    );
    vi.mocked(connectionModule.readRowsSync).mockImplementation((_connection, query) => {
      if (query === FILE_ROWS_QUERY) return [{
        path: 'src/app.ts',
        mtime: 123.5,
        size: 2,
        contentHash: 'sha256:app',
      }];
      if (query === NODE_ROWS_QUERY) return [
        {
          id: 1, key: 'src/app.ts', type: 'file', label: 'app.ts', filePath: 'src/app.ts',
        },
        {
          id: 2, key: 'symbol-1', type: 'symbol', label: 'App', filePath: 'src/app.ts',
        },
      ];
      if (query === SYMBOL_ROWS_QUERY) return [{
        nodeId: 2,
        nodeKey: 'symbol-1',
        ownerFilePath: 'src/app.ts',
        name: 'App',
        kind: 'class',
      }];
      if (query === EDGE_ROWS_QUERY) return [];
      return [];
    });

    expect(readWorkspaceAnalysisDatabaseSnapshot('/workspace')).toMatchObject({
      files: [{ filePath: 'src/app.ts', mtime: 123.5, size: 2 }],
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

  it('reads only canonical graph records for a projected Relationship Graph', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(connectionModule.withReadOnlyConnection).mockImplementation(
      (_path, callback) => callback('connection' as never),
    );
    vi.mocked(connectionModule.readRowsSync).mockImplementation((_connection, query) => {
      if (query === NODE_ROWS_QUERY) return [
        { id: 1, key: 'a.ts', type: 'file', label: 'a.ts', filePath: 'a.ts' },
        { id: 2, key: 'b.ts', type: 'file', label: 'b.ts', filePath: 'b.ts' },
      ];
      if (query === SYMBOL_ROWS_QUERY) return [];
      if (query === EDGE_ROWS_QUERY) return [{
        key: 'a.ts->b.ts#import',
        sourceNodeKey: 'a.ts',
        targetNodeKey: 'b.ts',
        type: 'import',
      }];
      throw new Error(`Unexpected query: ${query}`);
    });

    expect(readWorkspaceAnalysisDatabaseGraph('/workspace')).toEqual({
      nodes: [
        expect.objectContaining({ id: 'a.ts', nodeType: 'file' }),
        expect.objectContaining({ id: 'b.ts', nodeType: 'file' }),
      ],
      edges: [expect.objectContaining({ id: 'a.ts->b.ts#import', kind: 'import' })],
    });
    expect(connectionModule.readRowsSync).not.toHaveBeenCalledWith(
      expect.anything(),
      FILE_ROWS_QUERY,
    );
  });

  it('warns and returns an empty snapshot when reading fails', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(connectionModule.withReadOnlyConnection).mockImplementation(() => { throw new Error('broken'); });
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
