import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hasWorkspacePipelineIndex,
  persistWorkspacePipelineIndexMetadata,
} from '../../../../../src/extension/pipeline/service/cache/index';
import {
  readCodeGraphyRepoMeta,
  writeCodeGraphyRepoMeta,
} from '../../../../../src/extension/repoSettings/meta';
import type { ICodeGraphyRepoMeta } from '../../../../../src/extension/repoSettings/meta';

vi.mock('../../../../../src/extension/repoSettings/meta', () => ({
  readCodeGraphyRepoMeta: vi.fn(),
  writeCodeGraphyRepoMeta: vi.fn(),
}));

describe('pipeline/service/cache/index', () => {
  const tempRoots = new Set<string>();

  const meta = (overrides: Partial<ICodeGraphyRepoMeta> = {}): ICodeGraphyRepoMeta => ({
    version: 1,
    lastIndexedAt: '2026-01-01T00:00:00.000Z',
    lastIndexedCommit: 'abc123',
    pluginBuildSignature: null,
    pluginSignature: 'plugin-signature',
    settingsSignature: 'settings-signature',
    pendingChangedFiles: [],
    ...overrides,
  });

  function createWorkspaceRootWithDatabase(): string {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-index-cache-'));
    const databaseDirectory = path.join(workspaceRoot, '.codegraphy');
    fs.mkdirSync(databaseDirectory, { recursive: true });
    fs.writeFileSync(path.join(databaseDirectory, 'graph.sqlite'), '', 'utf8');
    tempRoots.add(workspaceRoot);
    return workspaceRoot;
  }

  function createWorkspaceRootWithoutDatabase(): string {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-index-cache-'));
    tempRoots.add(workspaceRoot);
    return workspaceRoot;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.mocked(readCodeGraphyRepoMeta).mockReturnValue(meta());
  });

  afterEach(() => {
    for (const workspaceRoot of tempRoots) {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
    tempRoots.clear();
  });

  it('returns false when no workspace root or no persisted index timestamp exists', () => {
    const workspaceRoot = createWorkspaceRootWithDatabase();

    expect(hasWorkspacePipelineIndex(undefined)).toBe(false);
    expect(readCodeGraphyRepoMeta).not.toHaveBeenCalled();

    vi.mocked(readCodeGraphyRepoMeta).mockReturnValueOnce(
      meta({ lastIndexedAt: null, lastIndexedCommit: null }),
    );

    expect(hasWorkspacePipelineIndex(workspaceRoot)).toBe(false);
  });

  it('returns false when metadata says indexed but the repo database is missing', () => {
    const workspaceRoot = createWorkspaceRootWithoutDatabase();

    expect(hasWorkspacePipelineIndex(workspaceRoot)).toBe(false);
  });

  it('still reports a saved index when persisted signatures do not match the current signatures', () => {
    const workspaceRoot = createWorkspaceRootWithDatabase();

    expect(hasWorkspacePipelineIndex(workspaceRoot)).toBe(true);
  });

  it('still reports a saved index when the current commit cannot be resolved', () => {
    const workspaceRoot = createWorkspaceRootWithDatabase();

    vi.mocked(readCodeGraphyRepoMeta).mockReturnValueOnce(
      meta({ lastIndexedCommit: null }),
    );
    expect(hasWorkspacePipelineIndex(workspaceRoot)).toBe(true);

    vi.mocked(readCodeGraphyRepoMeta).mockReturnValueOnce(meta());
    expect(hasWorkspacePipelineIndex(workspaceRoot)).toBe(true);
  });

  it('reports a saved index when metadata and the repo database exist', () => {
    const workspaceRoot = createWorkspaceRootWithDatabase();

    expect(hasWorkspacePipelineIndex(workspaceRoot)).toBe(true);

    vi.mocked(readCodeGraphyRepoMeta).mockReturnValueOnce(meta({ lastIndexedCommit: 'def456' }));
    expect(hasWorkspacePipelineIndex(workspaceRoot)).toBe(true);
  });

  it('still reports a saved index when the index is stale by commit', () => {
    const workspaceRoot = createWorkspaceRootWithDatabase();

    expect(hasWorkspacePipelineIndex(workspaceRoot)).toBe(true);
  });

  it('writes updated index metadata when a workspace root is available', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-16T08:45:00.000Z'));

    const warn = vi.fn();
    const persistIndexMetadata = vi.fn();
    const dependencies = {
      getPluginBuildSignature: vi.fn(() => 'next-plugin-build-signature'),
      getPluginSignature: vi.fn(() => 'next-plugin-signature'),
      getSettingsSignature: vi.fn(() => 'next-settings-signature'),
      persistIndexMetadata,
      warn,
    };

    await persistWorkspacePipelineIndexMetadata('/workspace', dependencies);

    expect(persistIndexMetadata).toHaveBeenCalledWith('/workspace', {
      pluginBuildSignature: 'next-plugin-build-signature',
      pluginSignature: 'next-plugin-signature',
      settingsSignature: 'next-settings-signature',
    });
    expect(writeCodeGraphyRepoMeta).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('records the current commit when index metadata is persisted', async () => {
    const persistIndexMetadata = vi.fn();
    const dependencies = {
      getCurrentCommitSha: vi.fn(() => 'def456'),
      getPluginBuildSignature: vi.fn(() => 'next-plugin-build-signature'),
      getPluginSignature: vi.fn(() => 'next-plugin-signature'),
      getSettingsSignature: vi.fn(() => 'next-settings-signature'),
      persistIndexMetadata,
      warn: vi.fn(),
    };

    await persistWorkspacePipelineIndexMetadata('/workspace', dependencies);

    expect(persistIndexMetadata).toHaveBeenCalledWith('/workspace', {
      pluginBuildSignature: 'next-plugin-build-signature',
      pluginSignature: 'next-plugin-signature',
      settingsSignature: 'next-settings-signature',
    });
    expect(writeCodeGraphyRepoMeta).toHaveBeenCalledWith('/workspace', {
      ...meta(),
      lastIndexedCommit: 'def456',
    });
  });

  it('delegates pending changed file cleanup to core metadata persistence', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-16T08:45:00.000Z'));
    vi.mocked(readCodeGraphyRepoMeta).mockReturnValueOnce(meta({
      pendingChangedFiles: ['src/stale.ts'],
    }));
    const persistIndexMetadata = vi.fn();
    const dependencies = {
      getPluginBuildSignature: vi.fn(() => 'plugin-build-signature'),
      getPluginSignature: vi.fn(() => 'plugin-signature'),
      getSettingsSignature: vi.fn(() => 'settings-signature'),
      persistIndexMetadata,
      warn: vi.fn(),
    };

    await persistWorkspacePipelineIndexMetadata('/workspace', dependencies);

    expect(persistIndexMetadata).toHaveBeenCalledWith('/workspace', {
      pluginBuildSignature: 'plugin-build-signature',
      pluginSignature: 'plugin-signature',
      settingsSignature: 'settings-signature',
    });
  });

  it('skips writes without a workspace root and warns on persistence failures', async () => {
    const warn = vi.fn();
    const error = new Error('disk full');
    const persistIndexMetadata = vi.fn(() => {
      throw error;
    });
    const dependencies = {
      getPluginBuildSignature: vi.fn(() => 'next-plugin-build-signature'),
      getPluginSignature: vi.fn(() => 'next-plugin-signature'),
      getSettingsSignature: vi.fn(() => 'next-settings-signature'),
      persistIndexMetadata,
      warn,
    };

    await persistWorkspacePipelineIndexMetadata(undefined, dependencies);
    expect(persistIndexMetadata).not.toHaveBeenCalled();

    await persistWorkspacePipelineIndexMetadata('/workspace', dependencies);

    expect(warn).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to update repo index metadata.',
      error,
    );
  });
});
