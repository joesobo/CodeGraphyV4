import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_EXCLUDE } from '../../src/discovery/pathMatching';
import {
  discoverWorkspacePipelineFiles,
  formatWorkspacePipelineLimitReachedMessage,
} from '../../src/analysis/workspaceDiscovery';

describe('pipeline/discovery', () => {
  it('merges default, plugin, and user filters before discovery', async () => {
    const discover = vi.fn(async () => ({
      durationMs: 2,
      files: ['src/index.ts'],
      limitReached: false,
      totalFound: 1,
    }));
    const signal = new AbortController().signal;

    await discoverWorkspacePipelineFiles(
      { discover },
      '/workspace',
      {
        filesExclude: [
          { pattern: '**/*.js', when: '$(basename).ts' },
          { pattern: '**/generated' },
        ],
        include: ['**/*'],
        maxFiles: 25,
        respectGitignore: false,
      },
      ['**/*.generated.ts', '**/*.generated.ts'],
      ['**/*.dist.ts'],
      signal,
    );

    expect(discover).toHaveBeenCalledWith({
      rootPath: '/workspace',
      maxFiles: 25,
      include: ['**/*'],
      exclude: [
          ...new Set([
          ...DEFAULT_EXCLUDE,
          '**/*.dist.ts',
          '**/*.generated.ts',
        ]),
      ],
      filesExclude: [
        { pattern: '**/*.js', when: '$(basename).ts' },
        { pattern: '**/generated' },
      ],
      respectGitignore: false,
      signal,
    });
  });

  it('formats the limit-reached warning message', () => {
    expect(formatWorkspacePipelineLimitReachedMessage(27, 10)).toBe(
      'CodeGraphy: Found 27+ files, showing first 10. Increase maxFiles in .codegraphy/settings.json to see more.',
    );
  });
});
