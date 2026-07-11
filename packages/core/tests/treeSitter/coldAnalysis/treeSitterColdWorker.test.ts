import { describe, expect, it, vi } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';
import { handleColdTreeSitterWorkerRequest } from '../../../src/treeSitter/runtime/coldAnalysis/treeSitterColdWorker';
import { emitActivePerfMetric } from '../../../src/diagnostics/perfMetrics';

vi.mock('../../../src/treeSitter/runtime/analyze', () => ({
  analyzeFileWithTreeSitter: vi.fn(),
}));

describe('pipeline/plugins/treesitter/runtime/coldAnalysis/treeSitterColdWorker', () => {
  it('returns the built-in analysis for a worker request', async () => {
    vi.mocked(analyzeFileWithTreeSitter).mockResolvedValue({
      filePath: '/workspace/app.ts',
      relations: [],
    });

    await expect(handleColdTreeSitterWorkerRequest({
      file: {
        absolutePath: '/workspace/app.ts',
        content: 'export {}',
        relativePath: 'app.ts',
      },
      id: 7,
      workspaceRoot: '/workspace',
    })).resolves.toEqual({
      id: 7,
      result: { filePath: '/workspace/app.ts', relations: [] },
    });
  });

  it('returns a serializable error instead of crashing the pool', async () => {
    vi.mocked(analyzeFileWithTreeSitter).mockRejectedValue(new Error('parse failed'));

    await expect(handleColdTreeSitterWorkerRequest({
      file: {
        absolutePath: '/workspace/app.ts',
        content: 'export {}',
        relativePath: 'app.ts',
      },
      id: 9,
      workspaceRoot: '/workspace',
    })).resolves.toEqual({ id: 9, error: 'Error: parse failed' });
  });

  it('returns parse metrics for the main thread collector', async () => {
    vi.mocked(analyzeFileWithTreeSitter).mockImplementation(async (filePath) => {
      emitActivePerfMetric({
        metric: 'treeSitterParseMs',
        value: 4.5,
        unit: 'ms',
        dimension: 'typescript',
      });
      return { filePath, relations: [] };
    });

    await expect(handleColdTreeSitterWorkerRequest({
      file: {
        absolutePath: '/workspace/app.ts',
        content: 'export {}',
        relativePath: 'app.ts',
      },
      id: 11,
      workspaceRoot: '/workspace',
    })).resolves.toEqual(expect.objectContaining({
      metrics: [{
        metric: 'treeSitterParseMs',
        value: 4.5,
        unit: 'ms',
        dimension: 'typescript',
      }],
    }));
  });
});
