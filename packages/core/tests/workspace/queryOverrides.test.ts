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
});
