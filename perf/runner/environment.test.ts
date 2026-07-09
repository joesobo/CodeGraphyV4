import { execFile } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createPerfRunEnvironment } from './environment';

const execFileAsync = promisify(execFile);

describe('performance run environment', () => {
  it('prepares a clean full-scale symbol workspace and preserves it until disposal', async () => {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    const environment = await createPerfRunEnvironment({
      fixture: 'small',
      repoRoot,
      symbols: true,
    });
    const markerPath = join(environment.workspacePath, 'warm-cache-marker');

    try {
      const settings = JSON.parse(await readFile(
        join(environment.workspacePath, '.codegraphy', 'settings.json'),
        'utf8',
      )) as {
        include?: unknown;
        maxFiles?: unknown;
        nodeVisibility?: Record<string, unknown>;
        plugins?: Array<{ id?: unknown; enabled?: unknown }>;
      };
      expect(settings.include).toEqual(['src/**/*.ts']);
      expect(settings.maxFiles).toBe(100);
      expect(settings.nodeVisibility?.symbol).toBe(true);
      expect(settings.nodeVisibility?.variable).toBe(true);
      expect(settings.plugins).toContainEqual({ id: 'codegraphy.typescript', enabled: true });
      const installedPlugins = JSON.parse(await readFile(
        join(environment.homePath, '.codegraphy', 'plugins.json'),
        'utf8',
      )) as { plugins?: Array<{ package?: unknown }> };
      expect(installedPlugins.plugins).toEqual([
        expect.objectContaining({ package: '@codegraphy-dev/plugin-typescript' }),
      ]);
      expect(await readFile(join(environment.workspacePath, '.gitignore'), 'utf8'))
        .toContain('.codegraphy/*');

      const { stdout: status } = await execFileAsync(
        'git',
        ['status', '--short'],
        { cwd: environment.workspacePath },
      );
      expect(status).toBe('');
      const { stdout: batchFiles } = await execFileAsync(
        'git',
        ['diff', '--name-only', 'perf-base..perf-batch-100'],
        { cwd: environment.workspacePath },
      );
      expect(batchFiles.trim().split('\n')).toHaveLength(100);
      const { stdout: batchSource } = await execFileAsync(
        'git',
        ['show', 'perf-batch-100:src/group-00000/file-000000.ts'],
        { cwd: environment.workspacePath },
      );
      expect(batchSource).toMatch(/^import '\.\/file-000001';/);

      await writeFile(markerPath, 'warm');
      expect(await readFile(markerPath, 'utf8')).toBe('warm');
      expect(await access(environment.homePath)).toBeUndefined();
    } finally {
      await environment.dispose();
    }

    await expect(access(environment.rootPath)).rejects.toThrow();
  });
});
