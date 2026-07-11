import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import {
  analyzeColdTreeSitterFiles,
  resolveColdWorkerPath,
  type ColdTreeSitterWorkerRequest,
} from '../../../src/treeSitter/runtime/coldAnalysis/pool';

class FakeWorker extends EventEmitter {
  readonly postMessage = vi.fn((request: ColdTreeSitterWorkerRequest) => {
    queueMicrotask(() => this.emit('message', {
      id: request.id,
      result: { filePath: request.file.absolutePath, relations: [] },
    }));
  });

  readonly terminate = vi.fn(async () => 0);
}

describe('pipeline/plugins/treesitter/runtime/coldAnalysis/pool', () => {
  it('locates the worker beside both library and CLI build outputs', () => {
    expect(resolveColdWorkerPath('/package/dist/index.js'))
      .toBe('/package/dist/treeSitterColdWorker.js');
    expect(resolveColdWorkerPath('/package/dist/cli/main.js'))
      .toBe('/package/dist/treeSitterColdWorker.js');
    expect(resolveColdWorkerPath('/extension/dist/extension.js'))
      .toBe('/extension/dist/treeSitterColdWorker.js');
  });

  it('uses at most processor count minus one workers and preserves result order', async () => {
    const workers: FakeWorker[] = [];
    const createWorker = vi.fn(() => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    });
    const files = Array.from({ length: 5 }, (_, index) => ({
      absolutePath: `/workspace/file-${index}.ts`,
      content: `export const value = ${index};`,
      relativePath: `file-${index}.ts`,
    }));

    const results = await analyzeColdTreeSitterFiles(files, '/workspace', {
      createWorker: createWorker as never,
      processorCount: 4,
    });

    expect(createWorker).toHaveBeenCalledTimes(3);
    expect(results.map(result => result.filePath)).toEqual(files.map(file => file.absolutePath));
    expect(workers.every(worker => worker.terminate.mock.calls.length === 1)).toBe(true);
  });

  it('falls back to main-thread analysis when a worker task fails', async () => {
    const worker = new FakeWorker();
    worker.postMessage.mockImplementationOnce(() => {
      queueMicrotask(() => worker.emit('error', new Error('worker failed')));
    });
    const analyzeLocally = vi.fn(async (filePath: string) => ({
      filePath,
      relations: [{ kind: 'fallback' }],
    }));

    const results = await analyzeColdTreeSitterFiles(
      [{ absolutePath: '/workspace/app.ts', content: 'export {}', relativePath: 'app.ts' }],
      '/workspace',
      {
        analyzeLocally: analyzeLocally as never,
        createWorker: (() => worker) as never,
        processorCount: 8,
      },
    );

    expect(analyzeLocally).toHaveBeenCalledWith(
      '/workspace/app.ts',
      'export {}',
      '/workspace',
    );
    expect(results[0]).toEqual(expect.objectContaining({ filePath: '/workspace/app.ts' }));
  });

  it('falls back instead of hanging when a worker exits without a response', async () => {
    const worker = new FakeWorker();
    worker.postMessage.mockImplementationOnce(() => {
      queueMicrotask(() => worker.emit('exit', 1));
    });
    const analyzeLocally = vi.fn(async (filePath: string) => ({ filePath, relations: [] }));

    await analyzeColdTreeSitterFiles(
      [{ absolutePath: '/workspace/app.ts', content: 'export {}', relativePath: 'app.ts' }],
      '/workspace',
      {
        analyzeLocally,
        createWorker: (() => worker) as never,
        processorCount: 2,
      },
    );

    expect(analyzeLocally).toHaveBeenCalledOnce();
  });
});
