import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import { runCli } from '../../src/cli/run';
import { requestCodeGraphyIndexWorkspace } from '../../src/workspace/requestIndexing';
import { readCodeGraphyWorkspaceSettings } from '../../src/workspace/settings';

describe('workspace query overrides', () => {
  it('temporarily narrows paths and Node Types without changing settings', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-overrides-'));
    await fs.mkdir(path.join(workspaceRoot, 'tests'));
    await fs.writeFile(path.join(workspaceRoot, 'app.ts'), 'export function app(): void {}\n');
    await fs.writeFile(path.join(workspaceRoot, 'tests', 'app.test.ts'), 'export function test(): void {}\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    const settingsBefore = readCodeGraphyWorkspaceSettings(workspaceRoot);
    const outputs: string[] = [];

    await runCli([
      '-C', workspaceRoot, 'nodes',
      '--filter', 'tests/**',
      '--node-type', 'file',
    ], { stdout: output => { outputs.push(output); } });

    const result = JSON.parse(outputs[0]) as { data: { nodes: Array<{ nodeType: string; path?: string }> } };
    expect(result.data.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeType: 'file', path: 'app.ts' }),
    ]));
    expect(result.data.nodes.every(node => node.nodeType === 'file')).toBe(true);
    expect(result.data.nodes).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'tests/app.test.ts' }),
    ]));
    expect(readCodeGraphyWorkspaceSettings(workspaceRoot)).toEqual(settingsBefore);
  });

  it('includes required parent Node Types for a transient child projection', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-child-type-'));
    await fs.writeFile(path.join(workspaceRoot, 'app.ts'), 'export function app(): void {}\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    const outputs: string[] = [];

    await runCli([
      '-C', workspaceRoot, 'nodes',
      '--node-type', 'symbol:function',
    ], { stdout: output => { outputs.push(output); } });

    const result = JSON.parse(outputs[0]) as {
      data: { nodes: Array<{ nodeType: string; path?: string }> };
    };
    expect(result.data.nodes).toEqual([
      expect.objectContaining({ nodeType: 'symbol:function', path: 'app.ts#app:function' }),
    ]);
  });

  it('matches overlapping and parent Node Types by symbol meaning', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-semantic-type-'));
    await fs.writeFile(path.join(workspaceRoot, 'main.go'), `package main

const Answer = 42

func Run() {}
`);
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });

    async function query(nodeType: string): Promise<Array<{ nodeType: string; path?: string }>> {
      const outputs: string[] = [];
      await runCli([
        '-C', workspaceRoot, 'nodes', '--node-type', nodeType,
      ], { stdout: output => { outputs.push(output); } });
      return (JSON.parse(outputs[0]) as {
        data: { nodes: Array<{ nodeType: string; path?: string }> };
      }).data.nodes;
    }

    await expect(query('symbol:callable')).resolves.toEqual([
      expect.objectContaining({ nodeType: 'symbol:function', path: 'main.go#Run:function' }),
    ]);
    await expect(query('symbol')).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'main.go#Run:function' }),
      expect.objectContaining({ path: 'main.go#Answer:constant' }),
    ]));
    await expect(query('variable')).resolves.toEqual([
      expect.objectContaining({ nodeType: 'symbol:constant', path: 'main.go#Answer:constant' }),
    ]);
  });
});
