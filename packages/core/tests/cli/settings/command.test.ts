import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../../src/cli/run';

async function createWorkspace(settings: unknown): Promise<string> {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-cli-settings-'));
  await fs.mkdir(path.join(workspace, '.codegraphy'), { recursive: true });
  await fs.writeFile(
    path.join(workspace, '.codegraphy/settings.json'),
    typeof settings === 'string' ? settings : `${JSON.stringify(settings, null, 2)}\n`,
  );
  return workspace;
}

describe('cli/settings command', () => {
  it('reads all effective settings or one requested value', async () => {
    const workspace = await createWorkspace({ version: 1, maxFiles: 1200, futureSetting: 'preserved' });
    const outputs: string[] = [];
    const stdout = (output: string): void => { outputs.push(output); };

    await expect(runCli(['-C', workspace, 'settings'], { stdout })).resolves.toBe(0);
    await expect(runCli(['-C', workspace, 'settings', 'get', 'maxFiles'], { stdout })).resolves.toBe(0);

    expect(JSON.parse(outputs[0])).toMatchObject({
      command: 'settings',
      data: {
        workspaceRoot: workspace,
        settings: { maxFiles: 1200, respectGitignore: true },
      },
    });
    expect(JSON.parse(outputs[1])).toMatchObject({
      command: 'settings',
      data: { workspaceRoot: workspace, key: 'maxFiles', value: 1200 },
    });
  });

  it('sets and unsets a validated setting without losing unknown fields', async () => {
    const workspace = await createWorkspace({ version: 1, maxFiles: 1200, futureSetting: 'preserved' });
    const outputs: string[] = [];
    const stdout = (output: string): void => { outputs.push(output); };

    await expect(runCli(['-C', workspace, 'settings', 'set', 'maxFiles', '2500'], { stdout })).resolves.toBe(0);
    expect(JSON.parse(outputs[0])).toMatchObject({
      data: {
        key: 'maxFiles',
        previous: 1200,
        value: 2500,
        indexRequired: true,
      },
    });
    expect(JSON.parse(await fs.readFile(path.join(workspace, '.codegraphy/settings.json'), 'utf8'))).toMatchObject({
      maxFiles: 2500,
      futureSetting: 'preserved',
    });

    await expect(runCli(['-C', workspace, 'settings', 'unset', 'maxFiles'], { stdout })).resolves.toBe(0);
    expect(JSON.parse(outputs[1])).toMatchObject({
      data: { key: 'maxFiles', previous: 2500, value: 1000, indexRequired: true },
    });
    const raw = JSON.parse(await fs.readFile(path.join(workspace, '.codegraphy/settings.json'), 'utf8'));
    expect(raw).not.toHaveProperty('maxFiles');
    expect(raw.futureSetting).toBe('preserved');
  });

  it('rejects invalid values and leaves the persisted bytes unchanged', async () => {
    const workspace = await createWorkspace({ version: 1, maxFiles: 1200 });
    const settingsPath = path.join(workspace, '.codegraphy/settings.json');
    const before = await fs.readFile(settingsPath, 'utf8');
    const stderr = vi.fn();

    await expect(runCli(['-C', workspace, 'settings', 'set', 'maxFiles', '-1'], { stderr })).resolves.toBe(1);

    expect(JSON.parse(stderr.mock.calls[0][0])).toMatchObject({
      error: {
        code: 'invalid_workspace_settings',
        message: 'maxFiles must be a positive integer',
        details: { path: settingsPath },
      },
    });
    await expect(fs.readFile(settingsPath, 'utf8')).resolves.toBe(before);
  });

  it('does not overwrite malformed persisted settings', async () => {
    const workspace = await createWorkspace('{ malformed');
    const settingsPath = path.join(workspace, '.codegraphy/settings.json');
    const before = await fs.readFile(settingsPath, 'utf8');
    const stderr = vi.fn();

    await expect(runCli(['-C', workspace, 'settings', 'set', 'maxFiles', '2500'], { stderr })).resolves.toBe(1);

    expect(JSON.parse(stderr.mock.calls[0][0])).toMatchObject({
      error: {
        code: 'invalid_workspace_settings',
        message: expect.any(String),
        details: { path: settingsPath },
      },
    });
    await expect(fs.readFile(settingsPath, 'utf8')).resolves.toBe(before);
  });
});
