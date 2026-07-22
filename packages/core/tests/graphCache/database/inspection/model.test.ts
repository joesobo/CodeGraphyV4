import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import Database from 'libsql';
import { afterEach, describe, expect, it } from 'vitest';
import { inspectWorkspaceAnalysisDatabase } from '../../../../src/graphCache/database/inspection/model';
import { getWorkspaceAnalysisDatabasePath } from '../../../../src/graphCache/database/storage';
import { requestCodeGraphyIndexWorkspace } from '../../../../src/workspace/requestIndexing';

const tempRoots: string[] = [];

async function createWorkspace(name: string): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), `codegraphy-${name}-`));
  tempRoots.push(workspaceRoot);
  return workspaceRoot;
}

async function createIndexedWorkspace(name: string): Promise<string> {
  const workspaceRoot = await createWorkspace(name);
  await fs.writeFile(path.join(workspaceRoot, 'Home.md'), '# Home\n');
  await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
  return workspaceRoot;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(workspaceRoot => fs.rm(
    workspaceRoot,
    { recursive: true, force: true },
  )));
});

describe('graph cache database inspection', () => {
  it('reports a missing Graph Cache', async () => {
    const workspaceRoot = await createWorkspace('inspection-missing');

    expect(inspectWorkspaceAnalysisDatabase(workspaceRoot)).toEqual({
      ok: false,
      schemaVersion: null,
      expectedSchemaVersion: 9,
      schemaCompatible: false,
      integrityOk: false,
      foreignKeyOk: false,
      records: { indexedFiles: 0, nodes: 0, symbols: 0, edges: 0 },
      message: 'Graph Cache does not exist.',
    });
  });

  it('reports schema, integrity, foreign keys, and record counts separately', async () => {
    const workspaceRoot = await createIndexedWorkspace('inspection-healthy');

    expect(inspectWorkspaceAnalysisDatabase(workspaceRoot)).toEqual({
      ok: true,
      schemaVersion: 9,
      expectedSchemaVersion: 9,
      schemaCompatible: true,
      integrityOk: true,
      foreignKeyOk: true,
      records: { indexedFiles: 1, nodes: 1, symbols: 0, edges: 0 },
    });
  });

  it('reports an incompatible schema without reading record counts', async () => {
    const workspaceRoot = await createIndexedWorkspace('inspection-schema');
    const database = new Database(getWorkspaceAnalysisDatabasePath(workspaceRoot));
    database.exec('DROP TABLE Symbol');
    database.close();

    expect(inspectWorkspaceAnalysisDatabase(workspaceRoot)).toMatchObject({
      ok: false,
      schemaVersion: 9,
      schemaCompatible: false,
      integrityOk: true,
      foreignKeyOk: true,
      records: { indexedFiles: 0, nodes: 0, symbols: 0, edges: 0 },
      message: 'Graph Cache schema does not match this CodeGraphy version.',
    });
  });

  it('reports foreign-key damage without treating it as integrity damage', async () => {
    const workspaceRoot = await createIndexedWorkspace('inspection-foreign-key');
    const database = new Database(getWorkspaceAnalysisDatabasePath(workspaceRoot));
    database.pragma('foreign_keys = OFF');
    database.prepare(`INSERT INTO Edge(key, sourceNodeId, targetNodeId, type)
      VALUES ('broken-edge', 999999, 999999, 'import')`).run();
    database.close();

    expect(inspectWorkspaceAnalysisDatabase(workspaceRoot)).toMatchObject({
      ok: false,
      schemaCompatible: true,
      integrityOk: true,
      foreignKeyOk: false,
      message: 'Graph Cache integrity check failed.',
    });
  });

  it('reports integrity damage without treating it as foreign-key damage', async () => {
    const workspaceRoot = await createIndexedWorkspace('inspection-integrity');
    const database = new Database(getWorkspaceAnalysisDatabasePath(workspaceRoot));
    database.pragma('ignore_check_constraints = ON');
    database.prepare('UPDATE NodeView SET favorite = 2').run();
    database.close();

    expect(inspectWorkspaceAnalysisDatabase(workspaceRoot)).toMatchObject({
      ok: false,
      schemaCompatible: true,
      integrityOk: false,
      foreignKeyOk: true,
      message: 'Graph Cache integrity check failed.',
    });
  });

  it('reports an unreadable database error', async () => {
    const workspaceRoot = await createWorkspace('inspection-corrupt');
    await fs.mkdir(path.join(workspaceRoot, '.codegraphy'));
    await fs.writeFile(getWorkspaceAnalysisDatabasePath(workspaceRoot), 'not sqlite');

    expect(inspectWorkspaceAnalysisDatabase(workspaceRoot)).toMatchObject({
      ok: false,
      schemaVersion: null,
      schemaCompatible: false,
      integrityOk: false,
      foreignKeyOk: false,
      records: { indexedFiles: 0, nodes: 0, symbols: 0, edges: 0 },
      message: expect.any(String),
    });
  });
});
