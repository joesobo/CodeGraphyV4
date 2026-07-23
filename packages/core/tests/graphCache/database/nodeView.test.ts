import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createEmptyWorkspaceAnalysisCache } from '../../../src/analysis/cache';
import { readRowsSync, withConnection } from '../../../src/graphCache/database/io/connection';
import {
  getWorkspaceAnalysisDatabasePath,
  saveWorkspaceAnalysisDatabaseCache,
} from '../../../src/graphCache/database/storage';

const tempRoots = new Set<string>();

afterEach(() => {
  for (const workspaceRoot of tempRoots) fs.rmSync(workspaceRoot, { recursive: true, force: true });
  tempRoots.clear();
});

describe('Graph Cache semantic tables', () => {
  it('does not create a Core-owned node view table', () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-semantic-cache-'));
    tempRoots.add(workspaceRoot);
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, createEmptyWorkspaceAnalysisCache(), {
      nodes: [{ id: 'src/app.ts', label: 'app.ts', nodeType: 'file' }],
      edges: [],
    });

    const tables = withConnection(getWorkspaceAnalysisDatabasePath(workspaceRoot), connection => (
      readRowsSync(connection, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    ));
    expect(tables).not.toContainEqual({ name: 'NodeView' });
  });
});
