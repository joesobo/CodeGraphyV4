import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  readWorkspaceAnalysisDatabaseRecordCounts,
} from '../../../../src/graphCache/database/recordCounts/model';
import { getWorkspaceAnalysisDatabasePath } from '../../../../src/graphCache/database/storage';
import { saveWorkspaceAnalysisDatabaseCache } from '../../../../src/graphCache/database/storage';
import { WORKSPACE_ANALYSIS_CACHE_VERSION } from '../../../../src/analysis/cache';
import { createWorkspaceRoot } from '../storage/fixture';

const emptyCounts = { indexedFiles: 0, nodes: 0, symbols: 0, edges: 0 };

describe('graph cache database record counts', () => {
  it('returns zero counts when the database is absent or unreadable', () => {
    const workspaceRoot = createWorkspaceRoot();
    expect(readWorkspaceAnalysisDatabaseRecordCounts(workspaceRoot)).toEqual(emptyCounts);

    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    fs.writeFileSync(databasePath, 'not sqlite');
    expect(readWorkspaceAnalysisDatabaseRecordCounts(workspaceRoot)).toEqual(emptyCounts);
  });

  it('reads each normalized table count independently', () => {
    const workspaceRoot = createWorkspaceRoot();
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/app.ts': {
          mtime: 1,
          size: 1,
          analysis: {
            filePath: path.join(workspaceRoot, 'src/app.ts'),
            symbols: [{
              id: 'src/app.ts:function:run',
              name: 'run',
              kind: 'function',
              filePath: 'src/app.ts',
            }],
          },
        },
      },
    }, {
      nodes: [
        { id: 'src/app.ts', label: 'app.ts', nodeType: 'file' },
        { id: 'src/app.ts#run:function', label: 'run', nodeType: 'symbol:function' },
      ],
      edges: [{
        id: 'src/app.ts->src/app.ts#contains',
        from: 'src/app.ts',
        to: 'src/app.ts#run:function',
        kind: 'contains',
        sources: [],
      }],
    });

    expect(readWorkspaceAnalysisDatabaseRecordCounts(workspaceRoot)).toEqual({
      indexedFiles: 1,
      nodes: 3,
      symbols: 1,
      edges: 1,
    });
  });
});
