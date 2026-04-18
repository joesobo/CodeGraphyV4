import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  getWorkspacePipelineFileStat,
  getWorkspacePipelineRoot,
} from '../../../src/extension/pipeline/io';

describe('pipeline/io', () => {
  it('returns the first workspace root when one exists', () => {
    expect(
      getWorkspacePipelineRoot([
        { uri: vscode.Uri.file('/workspace'), name: 'workspace', index: 0 },
      ] as never),
    ).toBe('/workspace');
  });

  it('returns undefined when no workspace folders exist', () => {
    expect(getWorkspacePipelineRoot(undefined)).toBeUndefined();
  });

  it('returns undefined when the workspace folder list is empty', () => {
    expect(getWorkspacePipelineRoot([] as never)).toBeUndefined();
  });

  it('returns undefined when the first workspace folder does not expose a uri', () => {
    expect(getWorkspacePipelineRoot([{ name: 'workspace', index: 0 }] as never)).toBeUndefined();
  });

  it('returns file stat details when the file system succeeds', async () => {
    const fileSystem = {
      stat: vi.fn(async () => ({ mtime: 17, size: 64 })),
    };

    await expect(
      getWorkspacePipelineFileStat('/workspace/src/index.ts', fileSystem as never),
    ).resolves.toEqual({ mtime: 17, size: 64 });
  });

  it('returns null when the file system stat call fails', async () => {
    const fileSystem = {
      stat: vi.fn(async () => {
        throw new Error('missing');
      }),
    };

    await expect(
      getWorkspacePipelineFileStat('/workspace/src/index.ts', fileSystem as never),
    ).resolves.toBeNull();
  });
});
