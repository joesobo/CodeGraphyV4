import type { execFileSync as execFileSyncType } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  hydrateMutationSeed,
  packageIncrementalFile,
} from '../../../../../scripts/mutation/seedCache';

function createRepoRoot(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writePackageSeed(repoRoot: string, packageName: string, content = '{"cached":true}'): void {
  const incrementalFile = packageIncrementalFile(repoRoot, packageName);
  mkdirSync(join(incrementalFile, '..'), { recursive: true });
  writeFileSync(incrementalFile, content);
}

function writeSeedSha(repoRoot: string, sha: string): void {
  const seedSha = join(repoRoot, 'reports/mutation/seed-sha.txt');
  mkdirSync(join(seedSha, '..'), { recursive: true });
  writeFileSync(seedSha, `${sha}\n`);
}

function createExecFileSync(options: {
  branch?: string;
  currentRepoRoot: string;
  latestSha?: string;
  mainRepoRoot: string;
  runId?: number;
}): typeof execFileSyncType {
  const execFileSync = vi.fn((command: string, args: readonly string[]) => {
    if (command === 'git' && args.join(' ') === 'rev-parse --abbrev-ref HEAD') {
      return options.branch ?? 'codex/test-suite-cleanup';
    }

    if (command === 'git' && args.join(' ') === 'worktree list --porcelain') {
      return [
        `worktree ${options.mainRepoRoot}`,
        'HEAD abc',
        'branch refs/heads/main',
        '',
        `worktree ${options.currentRepoRoot}`,
        'HEAD def',
        'branch refs/heads/codex/test-suite-cleanup',
        '',
      ].join('\n');
    }

    if (command === 'gh' && args.slice(0, 2).join(' ') === 'run list') {
      return JSON.stringify([{
        databaseId: options.runId ?? 123,
        headSha: options.latestSha ?? 'main-sha',
      }]);
    }

    if (command === 'gh' && args.slice(0, 2).join(' ') === 'run download') {
      const downloadDirectory = args[args.indexOf('--dir') + 1];
      const seedRoot = join(downloadDirectory, 'reports/mutation');
      mkdirSync(join(seedRoot, 'extension'), { recursive: true });
      writeFileSync(join(seedRoot, 'seed-sha.txt'), `${options.latestSha ?? 'main-sha'}\n`);
      writeFileSync(join(seedRoot, 'extension/stryker-incremental-extension.json'), '{"downloaded":true}');
      return '';
    }

    throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
  });

  return execFileSync as unknown as typeof execFileSyncType;
}

describe('hydrateMutationSeed', () => {
  it('uses the current worktree package cache when it already exists', () => {
    const repoRoot = createRepoRoot('codegraphy-seed-current-');
    writePackageSeed(repoRoot, 'extension');
    const execFileSync = vi.fn();

    const result = hydrateMutationSeed({
      env: {},
      execFileSync: execFileSync as unknown as typeof execFileSyncType,
      packageName: 'extension',
      repoRoot,
      stdout: { error: vi.fn() },
    });

    expect(result.status).toBe('local-cache');
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it('lets main create the package cache when no seed exists yet', () => {
    const repoRoot = createRepoRoot('codegraphy-seed-main-');

    const result = hydrateMutationSeed({
      env: {},
      execFileSync: createExecFileSync({
        branch: 'main',
        currentRepoRoot: repoRoot,
        mainRepoRoot: repoRoot,
      }),
      packageName: 'extension',
      repoRoot,
      stdout: { error: vi.fn() },
    });

    expect(result.status).toBe('main-checkout');
  });

  it('copies a current local main package seed into a new worktree', () => {
    const currentRepoRoot = createRepoRoot('codegraphy-seed-current-');
    const mainRepoRoot = createRepoRoot('codegraphy-seed-main-');
    writeSeedSha(mainRepoRoot, 'main-sha');
    writePackageSeed(mainRepoRoot, 'extension', '{"fromMain":true}');

    const result = hydrateMutationSeed({
      env: {},
      execFileSync: createExecFileSync({ currentRepoRoot, mainRepoRoot }),
      packageName: 'extension',
      repoRoot: currentRepoRoot,
      stdout: { error: vi.fn() },
    });

    expect(result.status).toBe('hydrated');
    expect(readFileSync(packageIncrementalFile(currentRepoRoot, 'extension'), 'utf8')).toBe('{"fromMain":true}');
  });

  it('refreshes stale local main seed cache from the CI artifact before copying', () => {
    const currentRepoRoot = createRepoRoot('codegraphy-seed-current-');
    const mainRepoRoot = createRepoRoot('codegraphy-seed-main-');
    writeSeedSha(mainRepoRoot, 'old-sha');

    hydrateMutationSeed({
      env: {},
      execFileSync: createExecFileSync({
        currentRepoRoot,
        latestSha: 'new-sha',
        mainRepoRoot,
        runId: 456,
      }),
      packageName: 'extension',
      repoRoot: currentRepoRoot,
      stdout: { error: vi.fn() },
    });

    expect(readFileSync(join(mainRepoRoot, 'reports/mutation/seed-sha.txt'), 'utf8')).toBe('new-sha\n');
    expect(readFileSync(packageIncrementalFile(currentRepoRoot, 'extension'), 'utf8')).toBe('{"downloaded":true}');
  });

  it('fails clearly when no successful CI seed artifact exists', () => {
    const currentRepoRoot = createRepoRoot('codegraphy-seed-current-');
    const mainRepoRoot = createRepoRoot('codegraphy-seed-main-');
    const baseExecFileSync = createExecFileSync({ currentRepoRoot, mainRepoRoot });
    const execFileSync = vi.fn((command: string, args?: readonly string[]) => {
      if (command === 'gh' && args?.slice(0, 2).join(' ') === 'run list') {
        return '[]';
      }

      return baseExecFileSync(command, args as string[]);
    }) as unknown as typeof execFileSyncType;

    expect(() => hydrateMutationSeed({
      env: {},
      execFileSync,
      packageName: 'extension',
      repoRoot: currentRepoRoot,
      stdout: { error: vi.fn() },
    })).toThrow('No successful mutation seed artifact was found for main');

    expect(existsSync(packageIncrementalFile(currentRepoRoot, 'extension'))).toBe(false);
  });
});
