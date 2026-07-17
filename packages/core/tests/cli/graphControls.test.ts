import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/cli/run';

async function createWorkspace(): Promise<string> {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-cli-controls-'));
  await fs.mkdir(path.join(workspace, '.codegraphy'), { recursive: true });
  await fs.writeFile(path.join(workspace, '.codegraphy/settings.json'), JSON.stringify({
    version: 1,
    extensionPanelPlacement: 'right',
    plugins: [{ id: 'codegraphy.future', enabled: false, futurePluginSetting: { mode: 'fast' } }],
    nodeVisibility: { file: true },
    edgeVisibility: { import: true },
    filterPatterns: ['**/dist/**'],
  }));
  return workspace;
}

describe('cli graph controls', () => {
  it('updates saved node and edge scope without losing extension settings', async () => {
    const workspace = await createWorkspace();
    const stdout = vi.fn();
    const stderr = vi.fn();

    await expect(runCli([
      '-C', workspace, 'scope', 'node', 'symbol:function', 'on',
    ], { stdout, stderr })).resolves.toBe(0);
    await expect(runCli([
      '-C', workspace, 'scope', 'edge', 'call', 'off',
    ], { stdout, stderr })).resolves.toBe(0);

    expect(JSON.parse(await fs.readFile(path.join(workspace, '.codegraphy/settings.json'), 'utf-8'))).toMatchObject({
      extensionPanelPlacement: 'right',
      nodeVisibility: { file: true, symbol: true, 'symbol:function': true },
      edgeVisibility: { import: true, call: false },
      plugins: [{
        id: 'codegraphy.future',
        enabled: false,
        futurePluginSetting: { mode: 'fast' },
      }],
    });
    expect(stderr).not.toHaveBeenCalled();
  });

  it('lists discoverable scope and mutates filter patterns idempotently', async () => {
    const workspace = await createWorkspace();
    const outputs: string[] = [];
    const stdout = (output: string): void => { outputs.push(output); };

    await expect(runCli(['-C', workspace, 'filter', 'add', '**/generated/**'], { stdout })).resolves.toBe(0);
    await expect(runCli(['-C', workspace, 'filter', 'add', '**/generated/**'], { stdout })).resolves.toBe(0);
    await expect(runCli(['-C', workspace, 'filter', 'remove', '**/dist/**'], { stdout })).resolves.toBe(0);
    await expect(runCli(['-C', workspace, 'scope'], { stdout })).resolves.toBe(0);

    const settings = JSON.parse(await fs.readFile(path.join(workspace, '.codegraphy/settings.json'), 'utf-8'));
    expect(settings.filterPatterns).toEqual(['**/generated/**']);
    expect(JSON.parse(outputs.at(-1) ?? '')).toMatchObject({
      nodes: expect.arrayContaining([
        { type: 'file', enabled: true, available: true },
        { type: 'symbol:function', enabled: false, available: false },
      ]),
      edges: expect.arrayContaining([
        { type: 'import', enabled: true, available: false },
      ]),
    });
  });
});
