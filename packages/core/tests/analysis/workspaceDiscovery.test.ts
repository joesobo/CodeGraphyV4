import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_EXCLUDE } from '../../src/discovery/pathMatching';
import {
  discoverWorkspacePipelineFiles,
  formatWorkspacePipelineLimitReachedMessage,
} from '../../src/analysis/workspaceDiscovery';

describe('pipeline/discovery', () => {
  it('passes active graph filters to file discovery', async () => {
    const discover = vi.fn(async () => ({
      durationMs: 2,
      files: ['src/index.ts'],
      cacheFilePaths: ['src/index.ts'],
      limitReached: false,
      totalFound: 1,
    }));
    const signal = new AbortController().signal;

    await discoverWorkspacePipelineFiles(
      { discover },
      '/workspace',
      {
        include: ['**/*'],
        maxFiles: 25,
        respectGitignore: false,
      },
      signal,
      ['**/*.generated.ts'],
    );

    expect(discover).toHaveBeenCalledWith({
      rootPath: '/workspace',
      maxFiles: 25,
      include: ['**/*'],
      exclude: [...DEFAULT_EXCLUDE],
      filter: ['**/*.generated.ts'],
      respectGitignore: false,
      signal,
    });
  });

  it('formats the limit-reached warning message', () => {
    expect(formatWorkspacePipelineLimitReachedMessage(27, 10)).toBe(
      'CodeGraphy: Found 27 files, showing first 10. Increase maxFiles in .codegraphy/settings.json to see more.',
    );
  });
});
