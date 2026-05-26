import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCliCommand } from '../../src/cli/command';

describe('cli/command', () => {
  it('dispatches help and plugin help without touching a workspace', async () => {
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
});
