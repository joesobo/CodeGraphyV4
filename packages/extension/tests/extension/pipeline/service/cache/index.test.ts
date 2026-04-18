import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  const meta = (overrides: Partial<ICodeGraphyRepoMeta> = {}): ICodeGraphyRepoMeta => ({
    version: 1,
    lastIndexedAt: '2026-01-01T00:00:00.000Z',
    lastIndexedCommit: 'abc123',
    pluginSignature: 'plugin-signature',
    settingsSignature: 'settings-signature',
    pendingChangedFiles: [],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.mocked(readCodeGraphyRepoMeta).mockReturnValue(meta());
  });

  it('returns false when no workspace root or no persisted index timestamp exists', () => {
    const dependencies = {
      getCurrentCommitShaSync: vi.fn(),
      getPluginSignature: vi.fn(() => 'plugin-signature'),
      getSettingsSignature: vi.fn(() => 'settings-signature'),
    };

    expect(hasWorkspacePipelineIndex(undefined, dependencies)).toBe(false);
    expect(readCodeGraphyRepoMeta).not.toHaveBeenCalled();

    vi.mocked(readCodeGraphyRepoMeta).mockReturnValueOnce(
      meta({ lastIndexedAt: null, lastIndexedCommit: null }),
    );

    expect(hasWorkspacePipelineIndex('/workspace', dependencies)).toBe(false);
    expect(dependencies.getCurrentCommitShaSync).not.toHaveBeenCalled();
  });

  it('returns false when persisted signatures do not match the current signatures', () => {
    const dependencies = {
      getCurrentCommitShaSync: vi.fn(() => 'abc123'),
      getPluginSignature: vi.fn(() => 'different-plugin-signature'),
      getSettingsSignature: vi.fn(() => 'settings-signature'),
    };

    expect(hasWorkspacePipelineIndex('/workspace', dependencies)).toBe(false);
    expect(dependencies.getCurrentCommitShaSync).not.toHaveBeenCalled();
  });

  it('treats a missing current commit as matching only when the persisted commit is also null', () => {
    const dependencies = {
      getCurrentCommitShaSync: vi.fn(() => null),
      getPluginSignature: vi.fn(() => 'plugin-signature'),
      getSettingsSignature: vi.fn(() => 'settings-signature'),
    };

    vi.mocked(readCodeGraphyRepoMeta).mockReturnValueOnce(
      meta({ lastIndexedCommit: null }),
    );
    expect(hasWorkspacePipelineIndex('/workspace', dependencies)).toBe(true);

    vi.mocked(readCodeGraphyRepoMeta).mockReturnValueOnce(meta());
    expect(hasWorkspacePipelineIndex('/workspace', dependencies)).toBe(false);
  });

  it('matches the stored commit when signatures are current', () => {
    const dependencies = {
      getCurrentCommitShaSync: vi.fn(() => 'abc123'),
      getPluginSignature: vi.fn(() => 'plugin-signature'),
      getSettingsSignature: vi.fn(() => 'settings-signature'),
    };

    expect(hasWorkspacePipelineIndex('/workspace', dependencies)).toBe(true);

    dependencies.getCurrentCommitShaSync.mockReturnValueOnce('def456');
    expect(hasWorkspacePipelineIndex('/workspace', dependencies)).toBe(false);
  });

  it('writes updated index metadata when a workspace root is available', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-16T08:45:00.000Z'));

    const warn = vi.fn();
    const dependencies = {
      getCurrentCommitSha: vi.fn(async () => 'def456'),
      getPluginSignature: vi.fn(() => 'next-plugin-signature'),
      getSettingsSignature: vi.fn(() => 'next-settings-signature'),
      warn,
    };

    await persistWorkspacePipelineIndexMetadata('/workspace', dependencies);

    expect(writeCodeGraphyRepoMeta).toHaveBeenCalledWith('/workspace', {
      version: 1,
      lastIndexedAt: '2026-04-16T08:45:00.000Z',
      lastIndexedCommit: 'def456',
      pluginSignature: 'next-plugin-signature',
      settingsSignature: 'next-settings-signature',
      pendingChangedFiles: [],
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('skips writes without a workspace root and warns on persistence failures', async () => {
    const warn = vi.fn();
    const dependencies = {
      getCurrentCommitSha: vi.fn(async () => 'def456'),
      getPluginSignature: vi.fn(() => 'next-plugin-signature'),
      getSettingsSignature: vi.fn(() => 'next-settings-signature'),
      warn,
    };

    await persistWorkspacePipelineIndexMetadata(undefined, dependencies);
    expect(writeCodeGraphyRepoMeta).not.toHaveBeenCalled();

    const error = new Error('disk full');
    vi.mocked(readCodeGraphyRepoMeta).mockImplementationOnce(() => {
      throw error;
    });

    await persistWorkspacePipelineIndexMetadata('/workspace', dependencies);

    expect(warn).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to update repo index metadata.',
      error,
    );
  });
});
