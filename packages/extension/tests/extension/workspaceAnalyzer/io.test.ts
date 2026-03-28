import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  getWorkspaceAnalyzerFileStat,
  getWorkspaceAnalyzerRoot,
} from '../../../src/extension/workspaceAnalyzer/io';

describe('workspaceAnalyzer/io', () => {
  it('returns the first workspace root when one exists', () => {
    expect(
      getWorkspaceAnalyzerRoot([
        { uri: vscode.Uri.file('/workspace'), name: 'workspace', index: 0 },
      ] as never),
    ).toBe('/workspace');
  });

  it('returns undefined when no workspace folders exist', () => {
    expect(getWorkspaceAnalyzerRoot(undefined)).toBeUndefined();
  });

  it('returns undefined when the workspace folder list is empty', () => {
    expect(getWorkspaceAnalyzerRoot([] as never)).toBeUndefined();
  });

  it('returns undefined when the first workspace folder does not expose a uri', () => {
    expect(getWorkspaceAnalyzerRoot([{ name: 'workspace', index: 0 }] as never)).toBeUndefined();
  });

  it('returns file stat details when the file system succeeds', async () => {
    const fileSystem = {
      stat: vi.fn(async () => ({ mtime: 17, size: 64 })),
    };

    await expect(
      getWorkspaceAnalyzerFileStat('/workspace/src/index.ts', fileSystem as never),
    ).resolves.toEqual({ mtime: 17, size: 64 });
  });

  it('returns null when the file system stat call fails', async () => {
    const fileSystem = {
      stat: vi.fn(async () => {
        throw new Error('missing');
      }),
    };

    await expect(
      getWorkspaceAnalyzerFileStat('/workspace/src/index.ts', fileSystem as never),
    ).resolves.toBeNull();
  });
});
