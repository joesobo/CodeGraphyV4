import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCliCommand } from '../../src/cli/command';

describe('cli/command', () => {
  it('dispatches help and plugin help without touching a workspace', async () => {
    await expect(runCliCommand({ name: 'setup' })).resolves.toMatchObject({ exitCode: 0 });
    await expect(runCliCommand({ name: 'help' })).resolves.toMatchObject({
      exitCode: 0,
      output: expect.stringContaining('CodeGraphy CLI'),
    });
    await expect(runCliCommand({ name: 'plugins', action: 'help' })).resolves.toMatchObject({
      exitCode: 0,
      output: expect.stringContaining('codegraphy plugins register'),
    });
  });

  it('dispatches status and index commands for an explicit workspace', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'codegraphy-cli-command-'));

    await expect(runCliCommand({ name: 'status', workspacePath: workspaceRoot })).resolves.toMatchObject({
      exitCode: 0,
      output: expect.stringContaining('CodeGraphy Workspace Graph Cache is missing'),
    });
    await expect(runCliCommand({ name: 'index', workspacePath: workspaceRoot })).resolves.toMatchObject({
      exitCode: 0,
      output: expect.stringContaining('CodeGraphy indexing completed'),
    });
  });

  it('emits verbose diagnostics outside command output', async () => {
    const diagnostics: string[] = [];

    const result = await runCliCommand(
      { name: 'status', verbose: true, workspacePath: '/workspace/project' },
      {
        writeDiagnostic: line => diagnostics.push(line),
      },
    );

    expect(JSON.parse(result.output)).toMatchObject({
      workspaceRoot: '/workspace/project',
    });
    expect(diagnostics).toContain(
      '[CodeGraphy] Starting command: status, workspace=/workspace/project',
    );
    expect(diagnostics).toContain(
      '[CodeGraphy] Command complete: status, exitCode=0',
    );
  });

  it('forwards verbose diagnostics from workspace indexing', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'codegraphy-cli-diagnostics-'));
    const diagnostics: string[] = [];

    const result = await runCliCommand(
      { name: 'index', verbose: true, workspacePath: workspaceRoot },
      {
        writeDiagnostic: line => diagnostics.push(line),
      },
    );

    expect(JSON.parse(result.output)).toMatchObject({
      workspaceRoot,
      graphCache: '.codegraphy/graph.lbug',
    });
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.stringContaining('[CodeGraphy] Starting indexing:'),
      expect.stringContaining('[CodeGraphy] Indexing complete:'),
    ]));
  });
});
