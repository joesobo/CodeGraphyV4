import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  discoverWorkspacePipelineFiles,
  formatWorkspacePipelineLimitReachedMessage,
} from '../../../../../src/extension/pipeline/discovery';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from '../../../../../src/extension/pipeline/service/runtime/discovery';

vi.mock('../../../../../src/extension/pipeline/discovery', () => ({
  discoverWorkspacePipelineFiles: vi.fn(),
  formatWorkspacePipelineLimitReachedMessage: vi.fn(),
}));

describe('pipeline/service/discovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes discovery results and falls back totalFound to the file count', async () => {
    const discovery = {
      discover: vi.fn(async () => ({
        durationMs: 12,
        files: [{ relativePath: 'src/a.ts' }],
        limitReached: false,
        totalFound: undefined,
      })),
    };

    const dependencies = createWorkspacePipelineDiscoveryDependencies(discovery as never);
    const result = await dependencies.discover({ workspaceRoot: '/workspace' } as never);

    expect(discovery.discover).toHaveBeenCalledWith({ workspaceRoot: '/workspace' });
    expect(result).toEqual({
      durationMs: 12,
      files: [{ relativePath: 'src/a.ts' }],
      limitReached: false,
      totalFound: 1,
    });
  });

  it('warns with the formatted limit message when discovery hits the max file limit', async () => {
    vi.mocked(discoverWorkspacePipelineFiles).mockResolvedValue({
      durationMs: 1,
      files: [],
      limitReached: true,
      totalFound: 250,
    } as never);
    vi.mocked(formatWorkspacePipelineLimitReachedMessage).mockReturnValue('limit reached');
    const showWarningMessage = vi.fn();

    const result = await discoverWorkspacePipelineFilesWithWarnings(
      { discover: vi.fn() } as never,
      '/workspace',
      { maxFiles: 200 } as never,
      ['**/*.ts'],
      ['plugin-filter'],
      undefined,
      showWarningMessage,
    );

    expect(discoverWorkspacePipelineFiles).toHaveBeenCalledWith(
      { discover: expect.any(Function) },
      '/workspace',
      { maxFiles: 200 },
      ['**/*.ts'],
      ['plugin-filter'],
      undefined,
    );
    expect(formatWorkspacePipelineLimitReachedMessage).toHaveBeenCalledWith(250, 200);
    expect(showWarningMessage).toHaveBeenCalledWith('limit reached');
    expect(result.limitReached).toBe(true);
  });

  it('returns discovery results without warning when the file limit is not reached', async () => {
    vi.mocked(discoverWorkspacePipelineFiles).mockResolvedValue({
      durationMs: 1,
      files: [{ relativePath: 'src/a.ts' }],
      limitReached: false,
      totalFound: 1,
    } as never);
    const showWarningMessage = vi.fn();

    await expect(
      discoverWorkspacePipelineFilesWithWarnings(
        { discover: vi.fn() } as never,
        '/workspace',
        { maxFiles: 200 } as never,
        [],
        [],
        undefined,
        showWarningMessage,
      ),
    ).resolves.toEqual({
      durationMs: 1,
      files: [{ relativePath: 'src/a.ts' }],
      limitReached: false,
      totalFound: 1,
    });

    expect(formatWorkspacePipelineLimitReachedMessage).not.toHaveBeenCalled();
    expect(showWarningMessage).not.toHaveBeenCalled();
  });
});
