import { beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execGitCommand } from '../../../../src/extension/gitHistory/exec';
import {
  createCodeGraphyPluginSignature,
  createCodeGraphySettingsSignature,
} from '../../../../src/extension/repoSettings/signatures';
import {
  createWorkspacePipelinePluginSignature,
  createWorkspacePipelineSettingsSignature,
  readWorkspacePipelineCurrentCommitSha,
  readWorkspacePipelineCurrentCommitShaSync,
} from '../../../../src/extension/pipeline/service/signatures';

vi.mock('../../../../src/extension/gitHistory/exec', () => ({
  execGitCommand: vi.fn(),
}));

vi.mock('../../../../src/extension/repoSettings/signatures', () => ({
  createCodeGraphyPluginSignature: vi.fn(),
  createCodeGraphySettingsSignature: vi.fn(),
}));

describe('pipeline/service/signatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps plugin ids and versions before creating the workspace plugin signature', () => {
    vi.mocked(createCodeGraphyPluginSignature).mockReturnValue('plugin-signature');

    const signature = createWorkspacePipelinePluginSignature([
      { plugin: { id: 'plugin.alpha', version: '1.0.0', extra: 'ignored' } },
      { plugin: { id: 'plugin.beta', version: '2.0.0', extra: 'ignored' } },
    ] as never);

    expect(createCodeGraphyPluginSignature).toHaveBeenCalledWith([
      { plugin: { id: 'plugin.alpha', version: '1.0.0' } },
      { plugin: { id: 'plugin.beta', version: '2.0.0' } },
    ]);
    expect(signature).toBe('plugin-signature');
  });

  it('passes the full config snapshot into the settings signature creator', () => {
    vi.mocked(createCodeGraphySettingsSignature).mockReturnValue('settings-signature');
    const config = {
      getAll: vi.fn(() => ({ showOrphans: true, maxFiles: 50 })),
    };

    const signature = createWorkspacePipelineSettingsSignature(config as never);

    expect(config.getAll).toHaveBeenCalledOnce();
    expect(createCodeGraphySettingsSignature).toHaveBeenCalledWith({
      showOrphans: true,
      maxFiles: 50,
    });
    expect(signature).toBe('settings-signature');
  });

  it('reads and trims the current commit sha asynchronously', async () => {
    vi.mocked(execGitCommand).mockResolvedValue('abc123\n');

    await expect(readWorkspacePipelineCurrentCommitSha('/workspace')).resolves.toBe('abc123');
    expect(execGitCommand).toHaveBeenCalledWith(['rev-parse', 'HEAD'], {
      workspaceRoot: '/workspace',
    });
  });

  it('returns null when the asynchronous git sha read fails', async () => {
    vi.mocked(execGitCommand).mockRejectedValue(new Error('git failed'));

    await expect(readWorkspacePipelineCurrentCommitSha('/workspace')).resolves.toBeNull();
  });

  it('reads and trims the current commit sha synchronously', () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'codegraphy-signatures-'));
    writeFileSync(join(workspaceRoot, 'tracked.txt'), 'tracked');
    execFileSync('git', ['init'], { cwd: workspaceRoot });
    execFileSync('git', ['config', 'user.name', 'CodeGraphy Tests'], { cwd: workspaceRoot });
    execFileSync('git', ['config', 'user.email', 'tests@codegraphy.dev'], { cwd: workspaceRoot });
    execFileSync('git', ['add', 'tracked.txt'], { cwd: workspaceRoot });
    execFileSync('git', ['commit', '-m', 'initial'], { cwd: workspaceRoot });
    const expectedSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: workspaceRoot,
      encoding: 'utf8',
    }).trim();

    expect(readWorkspacePipelineCurrentCommitShaSync(workspaceRoot)).toBe(expectedSha);
  });

  it('returns null when the synchronous git sha read fails', () => {
    expect(readWorkspacePipelineCurrentCommitShaSync('/path/that/does/not/exist')).toBeNull();
  });
});
