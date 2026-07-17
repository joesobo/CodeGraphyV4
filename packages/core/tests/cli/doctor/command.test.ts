import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../../src/cli/run';

describe('cli doctor', () => {
  it('returns actionable JSON and a nonzero exit when the workspace is unhealthy', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-doctor-'));
    const stdout = vi.fn();
    const stderr = vi.fn();

    await expect(runCli(['-C', workspace, 'doctor'], { stdout, stderr })).resolves.toBe(1);

    expect(stdout).not.toHaveBeenCalled();
    const result = JSON.parse(stderr.mock.calls[0][0]);
    expect(result).toMatchObject({
      ok: false,
      command: 'doctor',
      data: {
        healthy: false,
        checks: {
          runtime: { supported: expect.any(String) },
          settings: { ok: false, action: 'Run `codegraphy index` to create workspace settings.' },
          cache: { ok: false, state: 'missing', action: 'Run `codegraphy index`.' },
          plugins: { ok: true, warnings: [] },
        },
      },
      error: { code: 'workspace_unhealthy' },
    });
  });

  it('rejects malformed known settings fields', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-doctor-settings-'));
    await fs.mkdir(path.join(workspace, '.codegraphy'));
    await fs.writeFile(
      path.join(workspace, '.codegraphy/settings.json'),
      JSON.stringify({ filterPatterns: 'not-an-array', futureSetting: true }),
    );
    const stderr = vi.fn();

    await expect(runCli(['-C', workspace, 'doctor'], { stderr })).resolves.toBe(1);

    expect(JSON.parse(stderr.mock.calls[0][0])).toMatchObject({
      data: {
        checks: {
          settings: {
            ok: false,
            message: 'filterPatterns must be an array of strings',
          },
        },
      },
    });
  });

  it('rejects malformed plugin settings and plugin data', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-doctor-plugins-'));
    await fs.mkdir(path.join(workspace, '.codegraphy'));
    await fs.writeFile(
      path.join(workspace, '.codegraphy/settings.json'),
      JSON.stringify({ plugins: [3], pluginData: 'bad' }),
    );
    const stderr = vi.fn();

    await expect(runCli(['-C', workspace, 'doctor'], { stderr })).resolves.toBe(1);

    expect(JSON.parse(stderr.mock.calls[0][0])).toMatchObject({
      data: { checks: { settings: { ok: false, message: 'pluginData must be an object' } } },
    });
  });

  it.each([
    { id: 'codegraphy.vue', enabled: true },
    { package: '@codegraphy-dev/plugin-markdown' },
    { package: '@codegraphy-dev/plugin-markdown', enabled: false },
    { id: 'codegraphy.markdown', package: '@codegraphy-dev/plugin-markdown' },
  ])('accepts supported raw plugin shape %#', async (plugin) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-doctor-valid-plugin-'));
    await fs.mkdir(path.join(workspace, '.codegraphy'));
    await fs.writeFile(
      path.join(workspace, '.codegraphy/settings.json'),
      JSON.stringify({ plugins: [plugin] }),
    );
    const stderr = vi.fn();

    await runCli(['-C', workspace, 'doctor'], { stderr });

    expect(JSON.parse(stderr.mock.calls[0][0])).toMatchObject({
      data: { checks: { settings: { ok: true } } },
    });
  });

  it.each([
    { id: 'codegraphy.vue' },
    { enabled: true },
    { id: '', enabled: true },
    { package: '' },
    {},
  ])('rejects unsupported raw plugin shape %#', async (plugin) => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-doctor-invalid-plugin-'));
    await fs.mkdir(path.join(workspace, '.codegraphy'));
    await fs.writeFile(
      path.join(workspace, '.codegraphy/settings.json'),
      JSON.stringify({ plugins: [plugin] }),
    );
    const stderr = vi.fn();

    await runCli(['-C', workspace, 'doctor'], { stderr });

    expect(JSON.parse(stderr.mock.calls[0][0])).toMatchObject({
      data: { checks: { settings: { ok: false } } },
    });
  });
});
