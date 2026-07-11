import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearColdTreeSitterAnalysisCache,
  preAnalyzeColdTreeSitterFiles,
  takeColdTreeSitterAnalysis,
} from '../../../src/treeSitter/runtime/coldAnalysis/cache';

describe('pipeline/plugins/treesitter/runtime/coldAnalysis/cache', () => {
  beforeEach(() => {
    clearColdTreeSitterAnalysisCache();
  });

  it('precomputes supported non-C# files and serves each result once', async () => {
    const analyzeBatch = vi.fn(async (files: Array<{ absolutePath: string }>) =>
      files.map(file => ({
        filePath: file.absolutePath,
        relations: [{ kind: 'import', fromFilePath: file.absolutePath }],
      })),
    );
    const files = [
      { absolutePath: '/workspace/app.ts', content: 'export {}', relativePath: 'app.ts' },
      { absolutePath: '/workspace/lib.ts', content: 'export const value = 1;', relativePath: 'lib.ts' },
      { absolutePath: '/workspace/App.cs', content: 'class App {}', relativePath: 'App.cs' },
      { absolutePath: '/workspace/README.md', content: '# App', relativePath: 'README.md' },
    ];

    await preAnalyzeColdTreeSitterFiles(files, '/workspace', analyzeBatch as never);

    expect(analyzeBatch).toHaveBeenCalledWith([files[0], files[1]], '/workspace');
    expect(takeColdTreeSitterAnalysis('/workspace/app.ts', 'export {}')).toEqual(
      expect.objectContaining({ filePath: '/workspace/app.ts' }),
    );
    expect(takeColdTreeSitterAnalysis('/workspace/app.ts', 'export {}')).toBeUndefined();
    expect(takeColdTreeSitterAnalysis('/workspace/App.cs', 'class App {}')).toBeUndefined();
  });

  it('does not serve a result when file content no longer matches', async () => {
    const analyzeBatch = vi.fn(async () => [{
      filePath: '/workspace/app.ts',
      relations: [],
    }]);

    await preAnalyzeColdTreeSitterFiles(
      [{ absolutePath: '/workspace/app.ts', content: 'before', relativePath: 'app.ts' }],
      '/workspace',
      analyzeBatch,
    );

    expect(takeColdTreeSitterAnalysis('/workspace/app.ts', 'after')).toBeUndefined();
    expect(takeColdTreeSitterAnalysis('/workspace/app.ts', 'before')).toBeUndefined();
  });

  it('skips worker startup when fewer than two eligible files exist', async () => {
    const analyzeBatch = vi.fn();

    await preAnalyzeColdTreeSitterFiles(
      [{ absolutePath: '/workspace/app.ts', content: 'export {}', relativePath: 'app.ts' }],
      '/workspace',
      analyzeBatch,
    );

    expect(analyzeBatch).not.toHaveBeenCalled();
  });
});
