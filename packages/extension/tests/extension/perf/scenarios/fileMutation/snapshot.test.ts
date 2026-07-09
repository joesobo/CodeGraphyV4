import { describe, expect, it } from 'vitest';
import type * as vscode from 'vscode';
import {
  assertRestoredFileStates,
  captureFileStates,
} from '../../../../../src/extension/perf/scenarios/fileMutation/snapshot';

const workspaceFolderUri = { fsPath: '/fixture' } as vscode.Uri;

function existing(contents: number[]) {
  return new Map([
    ['src/file.ts', { exists: true as const, contents: new Uint8Array(contents) }],
  ]);
}

describe('extension/perf/scenarios/fileMutation/snapshot', () => {
  it('captures independent copies of existing file bytes', async () => {
    const contents = new Uint8Array([1, 2, 3]);
    const states = await captureFileStates(
      workspaceFolderUri,
      ['src/file.ts'],
      async () => contents,
    );
    contents[1] = 9;

    expect(states.get('src/file.ts')).toEqual({
      exists: true,
      contents: new Uint8Array([1, 2, 3]),
    });
  });

  it('captures a missing file', async () => {
    const states = await captureFileStates(
      workspaceFolderUri,
      ['src/missing.ts'],
      async () => undefined,
    );

    expect(states.get('src/missing.ts')).toEqual({ exists: false });
  });

  it('accepts byte-identical restored files', async () => {
    await expect(assertRestoredFileStates(
      'rename',
      workspaceFolderUri,
      existing([1, 2, 3]),
      async () => new Uint8Array([1, 2, 3]),
    )).resolves.toBeUndefined();
  });

  it('rejects a restored file with different bytes', async () => {
    await expect(assertRestoredFileStates(
      'delete',
      workspaceFolderUri,
      existing([1, 2, 3]),
      async () => new Uint8Array([1, 9, 3]),
    )).rejects.toThrow('Performance delete scenario did not restore src/file.ts');
  });

  it('rejects a restored file that gained trailing bytes', async () => {
    await expect(assertRestoredFileStates(
      'rename',
      workspaceFolderUri,
      existing([1, 2]),
      async () => new Uint8Array([1, 2, 3]),
    )).rejects.toThrow('Performance rename scenario did not restore src/file.ts');
  });

  it('rejects a restored file that is missing', async () => {
    await expect(assertRestoredFileStates(
      'delete',
      workspaceFolderUri,
      existing([1, 2, 3]),
      async () => undefined,
    )).rejects.toThrow('Performance delete scenario did not restore src/file.ts');
  });

  it('accepts a path that remains absent', async () => {
    const before = new Map([['src/file.ts', { exists: false as const }]]);

    await expect(assertRestoredFileStates(
      'create',
      workspaceFolderUri,
      before,
      async () => undefined,
    )).resolves.toBeUndefined();
  });

  it('rejects a previously absent path that now exists', async () => {
    const before = new Map([['src/file.ts', { exists: false as const }]]);

    await expect(assertRestoredFileStates(
      'create',
      workspaceFolderUri,
      before,
      async () => new Uint8Array(),
    )).rejects.toThrow('Performance create scenario did not restore src/file.ts');
  });
});
