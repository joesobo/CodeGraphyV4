import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import { readAnalysisCacheTiers } from '../../src/analysis/fileAnalysis';
import { runCli } from '../../src/cli/run';
import { readRowsSync, withConnection } from '../../src/graphCache/database/io/connection';
import {
    getWorkspaceAnalysisDatabasePath,
    loadWorkspaceAnalysisDatabaseCache,
} from '../../src/graphCache/database/storage';
import { requestCodeGraphyIndexWorkspace } from '../../src/workspace/requestIndexing';
import { requestWorkspaceGraphQuery } from '../../src/workspace/requestQuery';
import { readCodeGraphyWorkspaceStatusForCli } from '../../src/workspace/requestStatus';
import {
    readCodeGraphyWorkspaceSettings,
    writeCodeGraphyWorkspaceSettings,
} from '../../src/workspace/settings';

describe('core-backed CodeGraphy Workspace commands', () => {

  it('indexes symbols once and reveals them when symbol scope is enabled', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-cli-symbol-upgrade-'));
    await fs.writeFile(path.join(workspaceRoot, 'target.ts'), 'export function target(): void {}\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    const baselineCache = loadWorkspaceAnalysisDatabaseCache(workspaceRoot);
    expect(readAnalysisCacheTiers(baselineCache.files['target.ts']!.analysis)).toContain('baseline');
    expect(readAnalysisCacheTiers(baselineCache.files['target.ts']!.analysis)).toContain('symbols');
    expect(baselineCache.files['target.ts']!.analysis.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'target', kind: 'function' }),
    ]));
    const persistedSymbolNodes = withConnection(
      getWorkspaceAnalysisDatabasePath(workspaceRoot),
      connection => readRowsSync(
        connection,
        `SELECT Node.key AS id, Node.type, File.path AS filePath
          FROM Symbol
          JOIN Node ON Node.id = Symbol.nodeId
          LEFT JOIN File ON File.id = Node.fileId
          WHERE Node.type = 'symbol:function'`,
      ),
    );
    expect(persistedSymbolNodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: expect.stringContaining('target.ts'),
        type: 'symbol:function',
        filePath: 'target.ts',
      }),
    ]));
    const outputs: string[] = [];

    await expect(runCli([
      '-C', workspaceRoot, 'scope', 'node', 'symbol:function', 'on',
    ], { stdout: output => { outputs.push(output); } })).resolves.toBe(0);

    expect(JSON.parse(outputs[0])).toMatchObject({
      data: {
        indexRequired: false,
      },
    });
    expect(readCodeGraphyWorkspaceStatusForCli({ workspacePath: workspaceRoot }).state).toBe('fresh');
    const nodeReport = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'nodes',
      arguments: {},
    });
    expect(nodeReport.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        nodeType: 'symbol:function',
        symbol: expect.objectContaining({ name: 'target', kind: 'function' }),
      }),
    ]));
  });

  it('expands file convenience queries across visible symbol endpoints', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-cli-file-intent-'));
    await fs.writeFile(path.join(workspaceRoot, 'app.ts'), "import { greet } from './greet';\ngreet();\n");
    await fs.writeFile(path.join(workspaceRoot, 'greet.ts'), 'export function greet(): void {}\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...settings,
      nodeVisibility: { 'symbol:function': true },
      edgeVisibility: { import: false, call: true, contains: true },
    });
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    const outputs: string[] = [];
    const stdout = (output: string): void => { outputs.push(output); };

    await runCli(['-C', workspaceRoot, 'dependents', 'greet.ts'], { stdout });
    await runCli(['-C', workspaceRoot, 'path', 'app.ts', 'greet.ts'], { stdout });

    expect(JSON.parse(outputs[0]).data.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'app.ts', to: 'greet.ts' }),
    ]));
    expect(JSON.parse(outputs[1]).data.paths).toContainEqual(['app.ts', 'greet.ts']);
  });
});
