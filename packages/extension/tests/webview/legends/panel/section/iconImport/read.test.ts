import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileAsArrayBuffer } from '../../../../../../src/webview/components/legends/panel/section/iconImport/read';

function createNativeFile(buffer: ArrayBuffer): File {
  return {
    arrayBuffer: vi.fn(async () => buffer),
  } as unknown as File;
}

function installFileReader(result: ArrayBuffer | string, error: Error | null = null): void {
  class TestFileReader {
    error = error;
    result: ArrayBuffer | string | null = null;
    private listeners = new Map<string, () => void>();

    addEventListener(event: string, listener: () => void): void {
      this.listeners.set(event, listener);
    }

    readAsArrayBuffer(): void {
      if (error) {
        this.listeners.get('error')?.();
        return;
      }

      this.result = result;
      this.listeners.get('load')?.();
    }
  }

  vi.stubGlobal('FileReader', TestFileReader);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('legends/panel/section/iconImport read', () => {
  it('uses the native file arrayBuffer reader when available', async () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    const file = createNativeFile(buffer);

    await expect(readFileAsArrayBuffer(file)).resolves.toBe(buffer);
    expect(file.arrayBuffer).toHaveBeenCalledOnce();
  });

  it('falls back to FileReader when arrayBuffer is unavailable', async () => {
    const buffer = new Uint8Array([4, 5, 6]).buffer;
    installFileReader(buffer);

    await expect(readFileAsArrayBuffer({} as File)).resolves.toBe(buffer);
  });

  it('rejects when FileReader load does not produce an array buffer', async () => {
    installFileReader('not a buffer');

    await expect(readFileAsArrayBuffer({} as File)).rejects.toThrow('Unable to read icon file.');
  });

  it('rejects with the FileReader error when one is available', async () => {
    const readError = new Error('Disk nope');
    installFileReader(new ArrayBuffer(0), readError);

    await expect(readFileAsArrayBuffer({} as File)).rejects.toThrow(readError);
  });
});
