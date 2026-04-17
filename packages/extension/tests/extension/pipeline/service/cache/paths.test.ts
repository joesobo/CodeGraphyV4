import { describe, expect, it, vi } from 'vitest';
import {
  readWorkspacePipelineAnalysisFiles,
  toWorkspaceRelativePath,
} from '../../../../../src/extension/pipeline/service/cache/paths';

describe('pipeline/service/cache/paths', () => {
  it('returns workspace-relative paths for absolute and workspace-relative file paths', () => {
    expect(toWorkspaceRelativePath('/workspace', '/workspace/src/a.ts')).toBe('src/a.ts');
    expect(toWorkspaceRelativePath('/workspace', 'src/a.ts')).toBe('src/a.ts');
  });

  it('normalizes backslashes and rejects empty or out-of-workspace paths', () => {
    expect(toWorkspaceRelativePath('/workspace', 'src\\a.ts')).toBe('src/a.ts');
    expect(toWorkspaceRelativePath('/workspace', '/workspace')).toBeUndefined();
    expect(toWorkspaceRelativePath('/workspace', '/other/file.ts')).toBeUndefined();
  });

  it('reads analysis file contents in order and preserves the path metadata', async () => {
    const files = [
      {
        absolutePath: '/workspace/src/a.ts',
        relativePath: 'src/a.ts',
        extension: '.ts',
        name: 'a.ts',
      },
      {
        absolutePath: '/workspace/src/b.ts',
        relativePath: 'src/b.ts',
        extension: '.ts',
        name: 'b.ts',
      },
    ];
    const readContent = vi.fn(async (file: { relativePath: string }) => `content:${file.relativePath}`);

    await expect(readWorkspacePipelineAnalysisFiles(files as never, readContent)).resolves.toEqual([
      {
        absolutePath: '/workspace/src/a.ts',
        relativePath: 'src/a.ts',
        content: 'content:src/a.ts',
      },
      {
        absolutePath: '/workspace/src/b.ts',
        relativePath: 'src/b.ts',
        content: 'content:src/b.ts',
      },
    ]);

    expect(readContent).toHaveBeenNthCalledWith(1, files[0]);
    expect(readContent).toHaveBeenNthCalledWith(2, files[1]);
  });
});
