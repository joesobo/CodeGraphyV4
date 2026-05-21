import { beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execGitCommand } from '../../../../../src/extension/gitHistory/exec';
import {
  createWorkspacePipelinePluginSignature,
  createWorkspacePipelineSettingsSignature,
  readWorkspacePipelineCurrentCommitSha,
  readWorkspacePipelineCurrentCommitShaSync,
} from '../../../../../src/extension/pipeline/service/cache/signatures';

vi.mock('../../../../../src/extension/gitHistory/exec', () => ({
  execGitCommand: vi.fn(),
}));

describe('pipeline/service/cache/signatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fingerprints built-in runtime plugins and npm package plugins with package versions', () => {
    const signature = createWorkspacePipelinePluginSignature([
      {
        builtIn: true,
        plugin: { id: 'codegraphy.treesitter', version: '1.0.0', extra: 'ignored' },
      },
      {
        builtIn: true,
        sourcePackage: '@codegraphy-dev/plugin-markdown',
        plugin: { id: 'codegraphy.markdown', version: '1.0.4', extra: 'ignored' },
      },
      {
        builtIn: false,
        sourcePackage: '@codegraphy-dev/plugin-python',
        plugin: { id: 'codegraphy.python', version: 'runtime-version', extra: 'ignored' },
      },
    ] as never, {
      installedPlugins: [
        { package: '@codegraphy-dev/plugin-python', version: '2.0.4' },
      ],
      settings: {
        plugins: [
          { package: '@codegraphy-dev/plugin-markdown' },
          { package: '@codegraphy-dev/plugin-python' },
        ],
      },
    });

    expect(signature).toBe(
      'codegraphy.treesitter@1.0.0|codegraphy.markdown@1.0.4|npm:@codegraphy-dev/plugin-python@2.0.4',
    );
  });

  it('marks enabled workspace plugin packages that are not loaded into the runtime fingerprint', () => {
    expect(createWorkspacePipelinePluginSignature([], {
      installedPlugins: [],
      settings: {
        plugins: [
          { package: '@codegraphy-dev/plugin-python' },
        ],
      },
    })).toBe('npm:@codegraphy-dev/plugin-python@missing');
  });

  it('includes workspace plugin settings and filter patterns in the settings signature', () => {
    const config = {
      getAll: vi.fn(() => ({
        version: 1,
        maxFiles: 50,
        include: ['src/**'],
        respectGitignore: true,
        showOrphans: true,
        filterPatterns: ['dist/**'],
        disabledCustomFilterPatterns: [],
        disabledPluginFilterPatterns: [],
        plugins: [{ package: '@codegraphy-dev/plugin-python', options: { includeTests: true } }],
      })),
    };

    const signature = createWorkspacePipelineSettingsSignature(config as never);

    expect(config.getAll).toHaveBeenCalledOnce();
    expect(signature).not.toBe(createWorkspacePipelineSettingsSignature({
      getAll: () => ({
        version: 1,
        maxFiles: 50,
        include: ['src/**'],
        respectGitignore: true,
        showOrphans: true,
        filterPatterns: [],
        disabledCustomFilterPatterns: [],
        disabledPluginFilterPatterns: [],
        plugins: [{ package: '@codegraphy-dev/plugin-python', options: { includeTests: true } }],
      }),
    } as never));
    expect(signature).not.toBe(createWorkspacePipelineSettingsSignature({
      getAll: () => ({
        version: 1,
        maxFiles: 50,
        include: ['src/**'],
        respectGitignore: true,
        showOrphans: true,
        filterPatterns: ['dist/**'],
        disabledCustomFilterPatterns: [],
        disabledPluginFilterPatterns: [],
        plugins: [],
      }),
    } as never));
  });

  it('normalizes partial settings snapshots before hashing them', () => {
    expect(() => createWorkspacePipelineSettingsSignature({
      getAll: () => ({
        showOrphans: true,
        respectGitignore: true,
      }),
    } as never)).not.toThrow();
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
