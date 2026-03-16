import { describe, expect, it, vi } from 'vitest';
import {
  createEmptyWorkspaceAnalysisCache,
  loadWorkspaceAnalysisCache,
  saveWorkspaceAnalysisCache,
  WORKSPACE_ANALYSIS_CACHE_KEY,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
} from '../../../src/extension/workspaceAnalyzer/cache';

describe('workspaceAnalyzer/cache', () => {
  it('creates an empty cache with the current version', () => {
    expect(createEmptyWorkspaceAnalysisCache()).toEqual({
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {},
    });
  });

  it('returns the stored cache when the version matches', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const cached = {
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/index.ts': {
          mtime: 10,
          connections: [],
          size: 42,
        },
      },
    };

    expect(loadWorkspaceAnalysisCache(cached)).toBe(cached);
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] Loaded cache: 1 files');
  });

  it('creates an empty cache when the stored version differs', () => {
    expect(loadWorkspaceAnalysisCache({
      version: '0.0.0',
      files: {
        'src/index.ts': {
          mtime: 10,
          connections: [],
        },
      },
    })).toEqual({
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {},
    });
  });

  it('saves the cache through the provided update callback', () => {
    const cache = createEmptyWorkspaceAnalysisCache();
    const update = vi.fn();

    saveWorkspaceAnalysisCache(update, cache);

    expect(update).toHaveBeenCalledWith(WORKSPACE_ANALYSIS_CACHE_KEY, cache);
  });
});
