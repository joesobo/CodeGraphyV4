import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { WorkspaceCacheUpdateProgress } from './model';

const PATH_SIGNATURE_CONCURRENCY = 8;

interface FingerprintingWorkspaceCacheUpdateOptions {
  pathSignature(filePath: string): Promise<string>;
  update(
    filePaths: readonly string[],
    signal: AbortSignal,
    onProgress?: (progress: WorkspaceCacheUpdateProgress) => void,
  ): Promise<void>;
}

export function createFingerprintingWorkspaceCacheUpdate(
  options: FingerprintingWorkspaceCacheUpdateOptions,
): (
  filePaths: readonly string[],
  signal: AbortSignal,
  onProgress?: (progress: WorkspaceCacheUpdateProgress) => void,
) => Promise<void> {
  const appliedPathSignatures = new Map<string, string>();

  return async (filePaths, signal, onProgress) => {
    if (signal.aborted) return;
    const startingSignatures = await collectPathSignatures(
      filePaths,
      filePath => options.pathSignature(filePath),
    );
    const changedPaths = filePaths.filter(filePath => (
      appliedPathSignatures.get(filePath) !== startingSignatures.get(filePath)
    ));
    if (changedPaths.length === 0) return;
    await options.update(changedPaths, signal, onProgress);
    for (const filePath of changedPaths) {
      const signature = startingSignatures.get(filePath);
      if (signature !== undefined) appliedPathSignatures.set(filePath, signature);
    }
  };
}

async function collectPathSignatures(
  filePaths: readonly string[],
  pathSignature: (filePath: string) => Promise<string>,
): Promise<Map<string, string>> {
  const signatures = new Map<string, string>();
  let nextIndex = 0;
  const workerCount = Math.min(PATH_SIGNATURE_CONCURRENCY, filePaths.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < filePaths.length) {
      const filePath = filePaths[nextIndex];
      nextIndex += 1;
      if (filePath !== undefined) {
        signatures.set(filePath, await pathSignature(filePath));
      }
    }
  }));
  return signatures;
}

export async function createPathSignature(filePath: string): Promise<string> {
  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      return `directory:${fileStat.mtimeMs}:${fileStat.ctimeMs}:${fileStat.mode}`;
    }
    const contentHash = await hashFile(filePath);
    return `file:${fileStat.size}:${fileStat.mode}:${contentHash}`;
  } catch (error) {
    if (isMissingPathError(error)) return 'missing';
    throw error;
  }
}

function isMissingPathError(error: unknown): boolean {
  return error instanceof Error
    && 'code' in error
    && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const input = createReadStream(filePath);
    input.on('data', chunk => hash.update(chunk));
    input.on('error', reject);
    input.on('end', () => resolve(hash.digest('hex')));
  });
}
