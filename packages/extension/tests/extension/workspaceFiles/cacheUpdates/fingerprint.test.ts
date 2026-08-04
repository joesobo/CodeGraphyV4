import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  createFingerprintingWorkspaceCacheUpdate,
  createPathSignature,
} from '../../../../src/extension/workspaceFiles/cacheUpdates/fingerprint';

describe('workspaceFiles/cacheUpdates/fingerprint', () => {
  it('coalesces unchanged duplicate events but retains a real same-path change', async () => {
    const pathSignature = vi.fn(async () => 'signature-1');
    const updateWorkspaceFiles = vi.fn(async () => undefined);
    const update = createFingerprintingWorkspaceCacheUpdate({
      pathSignature,
      update: updateWorkspaceFiles,
    });
    const signal = new AbortController().signal;

    await update(['/workspace/src/new.ts'], signal);
    await update(['/workspace/src/new.ts'], signal);
    expect(updateWorkspaceFiles).toHaveBeenCalledOnce();

    pathSignature.mockResolvedValue('signature-2');
    await update(['/workspace/src/new.ts'], signal);
    expect(updateWorkspaceFiles).toHaveBeenCalledTimes(2);
  });

  it('bounds signature reads for large workspace-event batches', async () => {
    let activeReads = 0;
    let maxActiveReads = 0;
    const pathSignature = vi.fn(async (filePath: string) => {
      activeReads += 1;
      maxActiveReads = Math.max(maxActiveReads, activeReads);
      await new Promise<void>(resolve => setImmediate(resolve));
      activeReads -= 1;
      return `signature:${filePath}`;
    });
    const updateWorkspaceFiles = vi.fn(async () => undefined);
    const update = createFingerprintingWorkspaceCacheUpdate({
      pathSignature,
      update: updateWorkspaceFiles,
    });
    const paths = Array.from(
      { length: 40 },
      (_, index) => `/workspace/src/file-${index}.ts`,
    );

    await update(paths, new AbortController().signal);

    expect(maxActiveReads).toBe(8);
    expect(updateWorkspaceFiles).toHaveBeenCalledWith(paths, expect.any(AbortSignal), undefined);
  });

  it('forwards active update progress through the fingerprinting boundary', async () => {
    const onProgress = vi.fn();
    const updateWorkspaceFiles = vi.fn(async (
      _filePaths: readonly string[],
      _signal: AbortSignal,
      report?: (progress: { phase: string; current: number; total: number }) => void,
    ) => {
      report?.({ phase: 'Analyzing Files', current: 25, total: 58 });
    });
    const update = createFingerprintingWorkspaceCacheUpdate({
      pathSignature: vi.fn(async () => 'signature'),
      update: updateWorkspaceFiles,
    });

    await update(['/workspace/src/app.ts'], new AbortController().signal, onProgress);

    expect(onProgress).toHaveBeenCalledWith({
      phase: 'Analyzing Files',
      current: 25,
      total: 58,
    });
  });

  it('does not coalesce paths whose signature read failed', async () => {
    const signatureError = Object.assign(new Error('too many open files'), { code: 'EMFILE' });
    const pathSignature = vi.fn()
      .mockRejectedValueOnce(signatureError)
      .mockResolvedValueOnce('recovered-signature');
    const updateWorkspaceFiles = vi.fn(async () => undefined);
    const update = createFingerprintingWorkspaceCacheUpdate({
      pathSignature,
      update: updateWorkspaceFiles,
    });
    const signal = new AbortController().signal;

    await expect(update(['/workspace/src/app.ts'], signal)).rejects.toBe(signatureError);
    expect(updateWorkspaceFiles).not.toHaveBeenCalled();

    await update(['/workspace/src/app.ts'], signal);
    expect(updateWorkspaceFiles).toHaveBeenCalledOnce();
  });

  it('retries the same signature after targeted persistence fails', async () => {
    const metadataError = new Error('metadata write failed');
    const updateWorkspaceFiles = vi.fn()
      .mockRejectedValueOnce(metadataError)
      .mockResolvedValueOnce(undefined);
    const update = createFingerprintingWorkspaceCacheUpdate({
      pathSignature: vi.fn(async () => 'signature'),
      update: updateWorkspaceFiles,
    });
    const signal = new AbortController().signal;

    await expect(update(['/workspace/src/app.ts'], signal)).rejects.toBe(metadataError);
    await update(['/workspace/src/app.ts'], signal);

    expect(updateWorkspaceFiles).toHaveBeenCalledTimes(2);
  });

  it('distinguishes same-size content changes when timestamps are preserved', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-cache-signature-'));
    try {
      const filePath = path.join(tempRoot, 'same-size.ts');
      fs.writeFileSync(filePath, 'aaaa');
      const modifiedAt = fs.statSync(filePath).mtime;
      const firstSignature = await createPathSignature(filePath);

      fs.writeFileSync(filePath, 'bbbb');
      fs.utimesSync(filePath, modifiedAt, modifiedAt);
      const secondSignature = await createPathSignature(filePath);

      expect(secondSignature).not.toBe(firstSignature);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
