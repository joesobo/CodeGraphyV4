import { describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  createWorkspacePipelinePluginSignature,
  createWorkspacePipelineSettingsSignature,
  readWorkspacePipelineCurrentCommitSha,
  readWorkspacePipelineCurrentCommitShaSync,
} from '../../../../../src/extension/pipeline/service/cache/signatures';

function createGitWorkspace(): string {
  const workspaceRoot = mkdtempSync(join(tmpdir(), 'codegraphy-signatures-'));
  writeFileSync(join(workspaceRoot, 'tracked.txt'), 'tracked');
  execFileSync('git', ['init'], { cwd: workspaceRoot });
  execFileSync('git', ['config', 'user.name', 'CodeGraphy Tests'], { cwd: workspaceRoot });
  execFileSync('git', ['config', 'user.email', 'tests@codegraphy.dev'], { cwd: workspaceRoot });
  execFileSync('git', ['add', 'tracked.txt'], { cwd: workspaceRoot });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: workspaceRoot });
  return workspaceRoot;
}

describe('pipeline/service/cache/signatures', () => {

  it('fingerprints built-in plugin runtimes and npm package plugins with package versions', () => {
    const signature = createWorkspacePipelinePluginSignature([
      {
        builtIn: true,
        sourcePackage: '@codegraphy-dev/plugin-markdown',
        plugin: { id: 'codegraphy.markdown', version: '1.0.4', extra: 'ignored' },
      },
      {
        builtIn: false,
        sourcePackage: '@codegraphy-dev/plugin-vue',
        plugin: { id: 'codegraphy.vue', version: 'runtime-version', extra: 'ignored' },
      },
    ] as never, {
      installedPlugins: [
        { package: '@codegraphy-dev/plugin-vue', version: '2.0.4', pluginId: 'codegraphy.vue' },
      ],
      settings: {
        plugins: [
          { id: 'codegraphy.markdown', enabled: true },
          { id: 'codegraphy.vue', enabled: true },
        ],
      },
    });

    expect(signature).toBe(
      'codegraphy.markdown@1.0.4|npm:@codegraphy-dev/plugin-vue@2.0.4',
    );
  });

  it('marks enabled workspace plugin packages that are not loaded into the runtime fingerprint', () => {
    expect(createWorkspacePipelinePluginSignature([], {
      installedPlugins: [],
      settings: {
        plugins: [
          { id: 'codegraphy.vue', enabled: true },
        ],
      },
    })).toBe('npm:codegraphy.vue@missing');
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
        plugins: [{ id: 'codegraphy.vue', enabled: true, options: { includeTests: true } }],
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
        plugins: [{ id: 'codegraphy.vue', enabled: true, options: { includeTests: true } }],
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
    const workspaceRoot = createGitWorkspace();
    const expectedSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: workspaceRoot,
      encoding: 'utf8',
    }).trim();

    await expect(readWorkspacePipelineCurrentCommitSha(workspaceRoot)).resolves.toBe(expectedSha);
  });

  it('returns null when the asynchronous git sha read fails', async () => {
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

  it('returns null when the synchronous git sha read fails', () => {
    expect(readWorkspacePipelineCurrentCommitShaSync('/path/that/does/not/exist')).toBeNull();
  });
});
