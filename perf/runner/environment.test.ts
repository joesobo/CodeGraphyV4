import { execFile } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createPerfRunEnvironment } from './environment';

const execFileAsync = promisify(execFile);

describe('performance run environment', () => {
  it('copies self into isolation and adds 100 graph-member files only on its batch branch', {
    timeout: 120_000,
  }, async () => {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    const sourceTargetPath = join(repoRoot, 'perf', 'fixtures', 'paths.ts');
    const sourceBefore = await readFile(sourceTargetPath, 'utf8');
    const environment = await createPerfRunEnvironment({
      fixture: 'self',
      repoRoot,
    });

    try {
      expect(environment.fixture).toBe('self');
      expect(environment.workspacePath).not.toBe(repoRoot);
      expect(await readFile(
        join(environment.workspacePath, 'perf', 'fixtures', 'paths.ts'),
        'utf8',
      )).toBe(sourceBefore);
      await expect(access(join(environment.workspacePath, 'node_modules')))
        .rejects.toThrow();

      const settings = JSON.parse(await readFile(
        join(environment.workspacePath, '.codegraphy', 'settings.json'),
        'utf8',
      )) as { include?: unknown; maxFiles?: unknown; plugins?: unknown };
      expect(settings.include).toEqual(['**/*.ts', '**/*.tsx']);
      expect(settings.maxFiles).toEqual(expect.any(Number));
      expect(settings.plugins).toEqual(expect.arrayContaining([
        { id: 'codegraphy.typescript', enabled: true },
      ]));

      const { stdout: addedFiles } = await execFileAsync('git', [
        'diff',
        '--name-only',
        '--diff-filter=A',
        'perf-base..perf-batch-100',
      ], { cwd: environment.workspacePath });
      const paths = addedFiles.trim().split('\n');
      expect(paths).toHaveLength(100);
      expect(paths.every(path => path.startsWith('perf/self-batch-100/'))).toBe(true);
      const { stdout: baseBatchFiles } = await execFileAsync('git', [
        'ls-tree',
        '--name-only',
        'perf-base',
        'perf/self-batch-100',
      ], { cwd: environment.workspacePath });
      expect(baseBatchFiles).toBe('');
    } finally {
      await environment.dispose();
    }

    expect(await readFile(sourceTargetPath, 'utf8')).toBe(sourceBefore);
  });

  it('rejects symbol expansion before preparing a self environment', async () => {
    await expect(createPerfRunEnvironment({
      fixture: 'self',
      repoRoot: '/repo',
      symbols: true,
    })).rejects.toThrow('--symbols is not supported for the self performance fixture');
  });

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
