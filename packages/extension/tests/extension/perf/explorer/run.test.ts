import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import {
  runExplorerMutationComparison,
  type RunExplorerMutationComparisonInput,
} from '../../../../src/extension/perf/explorer/run';
import type { ExplorerComparisonRuntime } from '../../../../src/extension/perf/explorer/runtime';

const original = new Uint8Array([1, 2, 3]);
const workspaceFolderUri = { fsPath: '/fixture' } as vscode.Uri;

function setup(scenario: 'rename' | 'create' | 'delete') {
  const files = new Map<string, Uint8Array>();
  if (scenario === 'rename') {
    files.set('/fixture/src/group-00000/file-000004.ts', original);
  } else if (scenario === 'delete') {
    files.set('/fixture/src/group-00000/file-000003.ts', original);
  }
  let renameListener: ((event: vscode.FileRenameEvent) => void) | undefined;
  let createListener: ((event: vscode.FileCreateEvent) => void) | undefined;
  let deleteListener: ((event: vscode.FileDeleteEvent) => void) | undefined;
  const waitForWorkbenchDispatchTurn = vi.fn(async () => undefined);
  const runtime = {
    applyRenameFile: vi.fn(async (oldUri: vscode.Uri, newUri: vscode.Uri) => {
      const contents = files.get(oldUri.fsPath);
      if (!contents) return false;
      files.delete(oldUri.fsPath);
      files.set(newUri.fsPath, contents);
      renameListener?.({ files: [{ oldUri, newUri }] } as vscode.FileRenameEvent);
      return true;
    }),
    applyCreateFile: vi.fn(async (uri: vscode.Uri) => {
      files.set(uri.fsPath, new Uint8Array());
      createListener?.({ files: [uri] });
      return true;
    }),
    applyDeleteFile: vi.fn(async (uri: vscode.Uri) => {
      files.delete(uri.fsPath);
      deleteListener?.({ files: [uri] });
      return true;
    }),
    joinPath: vi.fn((_workspace: vscode.Uri, path: string) => ({
      fsPath: `/fixture/${path}`,
    }) as vscode.Uri),
    now: vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(31),
    onDidRenameFiles: vi.fn((listener: (event: vscode.FileRenameEvent) => void) => {
      renameListener = listener;
      return { dispose: vi.fn(() => { renameListener = undefined; }) };
    }),
    onDidCreateFiles: vi.fn((listener: (event: vscode.FileCreateEvent) => void) => {
      createListener = listener;
      return { dispose: vi.fn(() => { createListener = undefined; }) };
    }),
    onDidDeleteFiles: vi.fn((listener: (event: vscode.FileDeleteEvent) => void) => {
      deleteListener = listener;
      return { dispose: vi.fn(() => { deleteListener = undefined; }) };
    }),
    readFile: vi.fn(async (_workspace: vscode.Uri, path: string) => {
      const contents = files.get(`/fixture/${path}`);
      return contents ? new Uint8Array(contents) : undefined;
    }),
    waitForWorkbenchDispatchTurn,
    writeFile: vi.fn(async (uri: vscode.Uri, contents: Uint8Array) => {
      files.set(uri.fsPath, new Uint8Array(contents));
    }),
  } as unknown as ExplorerComparisonRuntime;
  const waitForRefreshIdle = vi.fn(async () => undefined);
  const input: RunExplorerMutationComparisonInput = {
    scenario,
    waitForRefreshIdle,
    workspaceFolderUri,
  };
  return { files, input, runtime, waitForRefreshIdle, waitForWorkbenchDispatchTurn };
}

describe('extension/perf/explorer/run', () => {
  it.each([
    ['rename', 'explorerRenameMs', 'workspace.onDidRenameFiles'],
    ['create', 'explorerCreateMs', 'workspace.onDidCreateFiles'],
    ['delete', 'explorerDeleteMs', 'workspace.onDidDeleteFiles'],
  ] as const)('measures the observable Explorer %s span', async (
    scenario,
    metric,
    observation,
  ) => {
    const harness = setup(scenario);

    await expect(runExplorerMutationComparison(harness.input, harness.runtime))
      .resolves.toEqual({ metric, observation, value: 21 });
  });

  it.each(['rename', 'create', 'delete'] as const)(
    'restores exact fixture bytes after Explorer %s',
    async (scenario) => {
      const harness = setup(scenario);
      const before = [...harness.files].map(([path, contents]) => [path, [...contents]]);

      await runExplorerMutationComparison(harness.input, harness.runtime);

      expect([...harness.files].map(([path, contents]) => [path, [...contents]]))
        .toEqual(before);
      expect(harness.waitForRefreshIdle).toHaveBeenCalledTimes(2);
    },
  );

  it('restores the fixture when the measured dispatch turn fails', async () => {
    const harness = setup('rename');
    harness.waitForWorkbenchDispatchTurn
      .mockRejectedValueOnce(new Error('workbench dispatch failed'))
      .mockResolvedValue(undefined);

    await expect(runExplorerMutationComparison(harness.input, harness.runtime))
      .rejects.toThrow('workbench dispatch failed');

    expect(harness.files.has('/fixture/src/group-00000/file-000004.ts')).toBe(true);
    expect(harness.files.has('/fixture/src/group-00000/file-000004.perf-renamed.ts'))
      .toBe(false);
  });

  it('leaves an unchanged fixture untouched when VS Code rejects the edit', async () => {
    const harness = setup('create');
    vi.mocked(harness.runtime.applyCreateFile).mockResolvedValue(false);

    await expect(runExplorerMutationComparison(harness.input, harness.runtime))
      .rejects.toThrow('VS Code did not apply Explorer create workspace edit');

    expect(harness.files.size).toBe(0);
    expect(harness.waitForRefreshIdle).not.toHaveBeenCalled();
  });

  it('detects a rejected workspace edit that changed the fixture', async () => {
    const harness = setup('create');
    vi.mocked(harness.runtime.applyCreateFile).mockImplementation(async (uri) => {
      harness.files.set(uri.fsPath, new Uint8Array());
      return false;
    });

    await expect(runExplorerMutationComparison(harness.input, harness.runtime))
      .rejects.toThrow(
        'Performance create scenario did not restore src/group-00000/perf-created.ts',
      );
  });
});
