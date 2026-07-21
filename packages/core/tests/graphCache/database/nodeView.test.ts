import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createEmptyWorkspaceAnalysisCache } from '../../../src/analysis/cache';
import { withConnection, readRowsSync } from '../../../src/graphCache/database/io/connection';
import {
  getWorkspaceAnalysisDatabasePath,
  saveWorkspaceAnalysisDatabaseCache,
  saveWorkspaceAnalysisDatabaseCacheAsync,
} from '../../../src/graphCache/database/storage';

const tempRoots = new Set<string>();

function createWorkspaceRoot(): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-node-view-'));
  tempRoots.add(workspaceRoot);
  return workspaceRoot;
}

function graphWithNode(id: string) {
  return {
    nodes: [{
      id,
      label: path.basename(id),
      color: '#ffffff',
      nodeType: 'file' as const,
      favorite: true,
      x: 10,
      y: 20,
    }],
    edges: [],
  };
}

function readNodeViewKeys(workspaceRoot: string): unknown[] {
  return withConnection(getWorkspaceAnalysisDatabasePath(workspaceRoot), connection =>
    readRowsSync(connection, 'SELECT nodeKey FROM NodeView ORDER BY nodeKey'));
}

afterEach(() => {
  for (const workspaceRoot of tempRoots) {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
  tempRoots.clear();
});

describe('Graph Cache node views', () => {
  it('prunes view state for nodes absent from a synchronous full save', () => {
    const workspaceRoot = createWorkspaceRoot();
    const cache = createEmptyWorkspaceAnalysisCache();
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache, graphWithNode('old.ts'));

    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache, graphWithNode('current.ts'));

    expect(readNodeViewKeys(workspaceRoot)).toEqual([{ nodeKey: 'current.ts' }]);
  });

  it('prunes view state for nodes absent from an asynchronous full save', async () => {
    const workspaceRoot = createWorkspaceRoot();
    const cache = createEmptyWorkspaceAnalysisCache();
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache, graphWithNode('old.ts'));

    await saveWorkspaceAnalysisDatabaseCacheAsync(workspaceRoot, cache, {
      graph: graphWithNode('current.ts'),
    });

    expect(readNodeViewKeys(workspaceRoot)).toEqual([{ nodeKey: 'current.ts' }]);
  });
});
