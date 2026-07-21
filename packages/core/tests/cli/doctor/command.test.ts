import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import Database from 'libsql';
import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../../src/cli/run';
import { requestCodeGraphyIndexWorkspace } from '../../../src/workspace/requestIndexing';
import { getWorkspaceAnalysisDatabasePath } from '../../../src/graphCache/database/storage';

describe('cli doctor', () => {
  it('reports index metadata and normalized graph record counts', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-doctor-indexed-'));
    await fs.writeFile(path.join(workspace, 'Home.md'), 'See [[Target.md]].\n');
    await fs.writeFile(path.join(workspace, 'Target.md'), '# Target\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspace });
    const stdout = vi.fn();

    await expect(runCli(['-C', workspace, 'doctor'], { stdout })).resolves.toBe(0);

    expect(JSON.parse(stdout.mock.calls[0][0])).toMatchObject({
      data: {
        checks: {
          cache: {
            ok: true,
            state: 'fresh',
            staleReasons: [],
            schemaVersion: 6,
            indexedAt: expect.any(String),
            records: {
              indexedFiles: 2,
              nodes: expect.any(Number),
              symbols: expect.any(Number),
              edges: expect.any(Number),
            },
          },
        },
      },
    });
  });

  it('reports a schema mismatch without repairing or erasing the cache', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-doctor-schema-'));
    await fs.writeFile(path.join(workspace, 'Home.md'), '# Home\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspace });
    const databasePath = getWorkspaceAnalysisDatabasePath(workspace);
    const damaged = new Database(databasePath);
    damaged.exec('DROP TABLE Symbol');
    damaged.close();
    const stderr = vi.fn();

    await expect(runCli(['-C', workspace, 'doctor'], { stderr })).resolves.toBe(1);

    expect(JSON.parse(stderr.mock.calls[0][0])).toMatchObject({
      data: {
        healthy: false,
        checks: {
          cache: {
            ok: false,
            schemaVersion: 6,
            expectedSchemaVersion: 6,
            schemaCompatible: false,
          },
        },
      },
    });
    const unchanged = new Database(databasePath, { readonly: true, fileMustExist: true });
    expect(unchanged.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'Symbol'").get())
      .toMatchObject({ count: 0 });
    expect(unchanged.prepare('SELECT count(*) AS count FROM File').get()).toMatchObject({ count: 1 });
    unchanged.close();
  });

  it('reports an unreadable cache without replacing its bytes', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-doctor-corrupt-'));
    await fs.mkdir(path.join(workspace, '.codegraphy'));
    await fs.writeFile(path.join(workspace, '.codegraphy/settings.json'), '{}');
    const databasePath = getWorkspaceAnalysisDatabasePath(workspace);
    await fs.writeFile(databasePath, 'not sqlite');
    const stderr = vi.fn();

    await expect(runCli(['-C', workspace, 'doctor'], { stderr })).resolves.toBe(1);

    expect(JSON.parse(stderr.mock.calls[0][0])).toMatchObject({
      data: { checks: { cache: { ok: false, schemaCompatible: false } } },
    });
    await expect(fs.readFile(databasePath, 'utf8')).resolves.toBe('not sqlite');
  });

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
