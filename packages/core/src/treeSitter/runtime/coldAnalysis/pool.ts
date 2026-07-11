import { cpus } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import type { IAnalysisFile, IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import {
  emitActivePerfMetric,
  type ActivePerfMetric,
} from '../../../diagnostics/perfMetrics';
import { analyzeFileWithTreeSitter } from '../analyze';

export interface ColdTreeSitterWorkerRequest {
  file: IAnalysisFile;
  id: number;
  workspaceRoot: string;
}

export interface ColdTreeSitterWorkerResponse {
  error?: string;
  id: number;
  metrics?: ActivePerfMetric[];
  result?: IFileAnalysisResult;
}

interface WorkerLike {
  off(event: 'error', listener: (error: Error) => void): this;
  off(event: 'exit', listener: (code: number) => void): this;
  off(event: 'message', listener: (response: ColdTreeSitterWorkerResponse) => void): this;
  off(event: 'messageerror', listener: (error: Error) => void): this;
  once(event: 'error', listener: (error: Error) => void): this;
  once(event: 'exit', listener: (code: number) => void): this;
  once(event: 'messageerror', listener: (error: Error) => void): this;
  on(event: 'message', listener: (response: ColdTreeSitterWorkerResponse) => void): this;
  postMessage(request: ColdTreeSitterWorkerRequest): void;
  terminate(): Promise<number>;
}

export interface ColdTreeSitterPoolDependencies {
  analyzeLocally?: (
    filePath: string,
    content: string,
    workspaceRoot: string,
  ) => Promise<IFileAnalysisResult | null>;
  createWorker?: () => WorkerLike;
  processorCount?: number;
}

export function resolveColdWorkerPath(
  currentRuntimeFilePath: string = typeof __filename === 'string'
    ? __filename
    : fileURLToPath(import.meta.url),
): string {
  const runtimeDirectory = path.dirname(currentRuntimeFilePath);
  const outputDirectory = path.basename(runtimeDirectory) === 'cli'
    ? path.dirname(runtimeDirectory)
    : runtimeDirectory;
  return path.join(outputDirectory, 'treeSitterColdWorker.js');
}

function createColdWorker(): WorkerLike {
  return new Worker(resolveColdWorkerPath());
}

function runWorkerTask(
  worker: WorkerLike,
  request: ColdTreeSitterWorkerRequest,
): Promise<IFileAnalysisResult> {
  return new Promise((resolve, reject) => {
    const cleanUp = (): void => {
      worker.off('error', onError);
      worker.off('exit', onExit);
      worker.off('message', onMessage);
      worker.off('messageerror', onMessageError);
    };
    const onError = (error: Error): void => {
      cleanUp();
      reject(error);
    };
    const onExit = (code: number): void => {
      cleanUp();
      reject(new Error(`Tree-sitter worker exited before responding (${code})`));
    };
    const onMessageError = (error: Error): void => {
      cleanUp();
      reject(error);
    };
    const onMessage = (response: ColdTreeSitterWorkerResponse): void => {
      if (response.id !== request.id) {
        return;
      }
      cleanUp();
      if (response.error || !response.result) {
        reject(new Error(response.error ?? 'Tree-sitter worker returned no result'));
        return;
      }
      for (const metric of response.metrics ?? []) {
        emitActivePerfMetric(metric);
      }
      resolve(response.result);
    };

    worker.once('error', onError);
    worker.once('exit', onExit);
    worker.once('messageerror', onMessageError);
    worker.on('message', onMessage);
    worker.postMessage(request);
  });
}

function createEmptyAnalysis(filePath: string): IFileAnalysisResult {
  return { filePath, relations: [] };
}

export async function analyzeColdTreeSitterFiles(
  files: IAnalysisFile[],
  workspaceRoot: string,
  dependencies: ColdTreeSitterPoolDependencies = {},
): Promise<IFileAnalysisResult[]> {
  if (files.length === 0) {
    return [];
  }

  const createWorker = dependencies.createWorker ?? createColdWorker;
  const analyzeLocally = dependencies.analyzeLocally ?? analyzeFileWithTreeSitter;
  const workerCount = Math.min(
    files.length,
    Math.max(1, (dependencies.processorCount ?? cpus().length) - 1),
  );
  const results = new Array<IFileAnalysisResult>(files.length);
  let nextIndex = 0;

  const workers = Array.from({ length: workerCount }, createWorker);
  await Promise.all(workers.map(async (worker) => {
    try {
      while (nextIndex < files.length) {
        const index = nextIndex;
        nextIndex += 1;
        const file = files[index];
        try {
          results[index] = await runWorkerTask(worker, { file, id: index, workspaceRoot });
        } catch {
          results[index] = await analyzeLocally(file.absolutePath, file.content, workspaceRoot)
            ?? createEmptyAnalysis(file.absolutePath);
        }
      }
    } finally {
      await worker.terminate();
    }
  }));

  return results;
}
