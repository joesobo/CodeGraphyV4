import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  readWorkspacePipelineCurrentCommitSha,
  readWorkspacePipelineCurrentCommitShaSync,
} from '../../../../src/extension/pipeline/cacheSignatures/commit';

const workspaces: string[] = [];

function createGitWorkspace(): string {
  const workspaceRoot = mkdtempSync(join(tmpdir(), 'codegraphy-signatures-'));
  workspaces.push(workspaceRoot);
  writeFileSync(join(workspaceRoot, 'tracked.txt'), 'tracked');
  execFileSync('git', ['init'], { cwd: workspaceRoot });
  execFileSync('git', ['config', 'user.name', 'CodeGraphy Tests'], { cwd: workspaceRoot });
  execFileSync('git', ['config', 'user.email', 'tests@codegraphy.dev'], { cwd: workspaceRoot });
  execFileSync('git', ['add', 'tracked.txt'], { cwd: workspaceRoot });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: workspaceRoot });
  return workspaceRoot;
}

afterEach(() => {
  for (const workspace of workspaces.splice(0)) rmSync(workspace, { force: true, recursive: true });
});

describe('workspace pipeline commit signature', () => {
  it('reads and trims the current commit sha asynchronously', async () => {
    const workspaceRoot = createGitWorkspace();
    const expectedSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: workspaceRoot,
      encoding: 'utf8',
    }).trim();

    await expect(readWorkspacePipelineCurrentCommitSha(workspaceRoot)).resolves.toBe(expectedSha);
  });

  it('returns null when the asynchronous git read fails', async () => {
    await expect(readWorkspacePipelineCurrentCommitSha('/path/that/does/not/exist')).resolves.toBeNull();
  });

  it('reads and trims the current commit sha synchronously', () => {
    const workspaceRoot = createGitWorkspace();
    const expectedSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: workspaceRoot,
      encoding: 'utf8',
    }).trim();

    expect(readWorkspacePipelineCurrentCommitShaSync(workspaceRoot)).toBe(expectedSha);
  });

  it('returns null when the synchronous git read fails', () => {
    expect(readWorkspacePipelineCurrentCommitShaSync('/path/that/does/not/exist')).toBeNull();
  });
});
