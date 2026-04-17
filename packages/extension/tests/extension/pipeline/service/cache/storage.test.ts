import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearWorkspacePipelineCache } from '../../../../../src/extension/pipeline/analysis/state';
import { saveWorkspaceAnalysisDatabaseCache } from '../../../../../src/extension/pipeline/database/cache/storage.ts';
import {
  clearWorkspacePipelineStoredCache,
  persistWorkspacePipelineCache,
} from '../../../../../src/extension/pipeline/service/cache/storage';

vi.mock('../../../../../src/extension/pipeline/analysis/state', () => ({
  clearWorkspacePipelineCache: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/database/cache/storage.ts', () => ({
  saveWorkspaceAnalysisDatabaseCache: vi.fn(),
}));

describe('pipeline/service/cache/storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates cache clearing to the shared workspace cache helper', () => {
    const cache = { files: {} };
    vi.mocked(clearWorkspacePipelineCache).mockReturnValue(cache as never);
    const logInfo = vi.fn();

    expect(clearWorkspacePipelineStoredCache('/workspace', logInfo)).toBe(cache);
    expect(clearWorkspacePipelineCache).toHaveBeenCalledWith('/workspace', logInfo);
  });

  it('skips cache persistence when no workspace root is available', () => {
    const warn = vi.fn();

    persistWorkspacePipelineCache(undefined, { files: {} } as never, warn);

    expect(saveWorkspaceAnalysisDatabaseCache).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('persists the repo-local cache when a workspace root is available', () => {
    const cache = { files: { 'src/a.ts': {} } };
    const warn = vi.fn();

    persistWorkspacePipelineCache('/workspace', cache as never, warn);

    expect(saveWorkspaceAnalysisDatabaseCache).toHaveBeenCalledWith('/workspace', cache);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns when saving the repo-local cache throws', () => {
    const cache = { files: {} };
    const warn = vi.fn();
    const error = new Error('save failed');
    vi.mocked(saveWorkspaceAnalysisDatabaseCache).mockImplementation(() => {
      throw error;
    });

    persistWorkspacePipelineCache('/workspace', cache as never, warn);

    expect(warn).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to persist repo-local analysis cache.',
      error,
    );
  });
});
