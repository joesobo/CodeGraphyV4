import { describe, expect, it, vi } from 'vitest';
import { preAnalyzeWorkspaceAnalyzerFiles } from '../../../../src/extension/workspaceAnalyzer/analysis/preAnalyze';

describe('workspaceAnalyzer/analysis/preAnalyze', () => {
  it('reads duplicate relative paths only once before notifying plugins', async () => {
    const readContent = vi.fn(
      async (file: { relativePath: string }) => `content:${file.relativePath}`,
    );
    const notifyPreAnalyze = vi.fn(async () => undefined);

    await preAnalyzeWorkspaceAnalyzerFiles(
      [
        {
          absolutePath: '/workspace/src/index.ts',
          relativePath: 'src/index.ts',
        },
        {
          absolutePath: '/workspace/duplicate/src/index.ts',
          relativePath: 'src/index.ts',
        },
      ] as never,
      '/workspace',
      {
        notifyPreAnalyze,
        readContent,
      },
    );

    expect(readContent).toHaveBeenCalledTimes(1);
    expect(notifyPreAnalyze).toHaveBeenCalledWith(
      [
        {
          absolutePath: '/workspace/src/index.ts',
          relativePath: 'src/index.ts',
          content: 'content:src/index.ts',
        },
        {
          absolutePath: '/workspace/duplicate/src/index.ts',
          relativePath: 'src/index.ts',
          content: 'content:src/index.ts',
        },
      ],
      '/workspace',
    );
  });
});
