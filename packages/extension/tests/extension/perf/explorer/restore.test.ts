import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import { restoreExplorerMutation } from '../../../../src/extension/perf/explorer/restore';
import { createFileMutationTarget } from '../../../../src/extension/perf/scenarios/fileMutation/targets';
import type { FileState } from '../../../../src/extension/perf/scenarios/fileMutation/snapshot';
import type { ExplorerComparisonRuntime } from '../../../../src/extension/perf/explorer/runtime';

const workspaceFolderUri = { fsPath: '/fixture' } as vscode.Uri;
const original = new Uint8Array([1, 2, 3]);

function setup(files: Map<string, Uint8Array>) {
  const runtime = {
    joinPath: vi.fn((_workspace, path: string) => ({ fsPath: `/fixture/${path}` })),
    applyRenameFile: vi.fn(async (oldUri: vscode.Uri, newUri: vscode.Uri) => {
      const contents = files.get(oldUri.fsPath);
      if (!contents) return false;
      files.delete(oldUri.fsPath);
      files.set(newUri.fsPath, contents);
      return true;
    }),
    applyCreateFile: vi.fn(async (uri: vscode.Uri) => {
      files.set(uri.fsPath, new Uint8Array());
      return true;
    }),
    applyDeleteFile: vi.fn(async (uri: vscode.Uri) => {
      files.delete(uri.fsPath);
      return true;
    }),
    readFile: vi.fn(async (_workspace, path: string) => files.get(`/fixture/${path}`)),
    waitForWorkbenchDispatchTurn: vi.fn(async () => undefined),
    writeFile: vi.fn(async (uri: vscode.Uri, contents: Uint8Array) => {
      files.set(uri.fsPath, new Uint8Array(contents));
    }),
  } as unknown as ExplorerComparisonRuntime;
  return runtime;
}

function existing(path: string): ReadonlyMap<string, FileState> {
  return new Map([[path, { exists: true, contents: original }]]);
}

describe('extension/perf/explorer/restore', () => {
  it('reverses the Explorer rename workspace edit', async () => {
    const target = createFileMutationTarget('rename');
    const files = new Map([[
      '/fixture/src/group-00000/file-000004.perf-renamed.ts',
      original,
    ]]);
    const runtime = setup(files);
    const before = new Map<string, FileState>([
      ['src/group-00000/file-000004.ts', { exists: true, contents: original }],
      ['src/group-00000/file-000004.perf-renamed.ts', { exists: false }],
    ]);

    await restoreExplorerMutation(target, workspaceFolderUri, before, runtime);

    expect(files.has('/fixture/src/group-00000/file-000004.ts')).toBe(true);
    expect(files.has('/fixture/src/group-00000/file-000004.perf-renamed.ts')).toBe(false);
  });

  it('deletes the file created by the Explorer workspace edit', async () => {
    const path = 'src/group-00000/perf-created.ts';
    const files = new Map([[`/fixture/${path}`, new Uint8Array()]]);
    const runtime = setup(files);

    await restoreExplorerMutation(
      createFileMutationTarget('create'),
      workspaceFolderUri,
      new Map([[path, { exists: false }]]),
      runtime,
    );

    expect(files.has(`/fixture/${path}`)).toBe(false);
  });

  it('recreates the exact bytes deleted by the Explorer workspace edit', async () => {
    const path = 'src/group-00000/file-000003.ts';
    const files = new Map<string, Uint8Array>();
    const runtime = setup(files);

    await restoreExplorerMutation(
      createFileMutationTarget('delete'),
      workspaceFolderUri,
      existing(path),
      runtime,
    );

    expect([...(files.get(`/fixture/${path}`) ?? [])]).toEqual([...original]);
    expect(runtime.writeFile).toHaveBeenCalledOnce();
  });

  it('waits one dispatch turn before asserting restoration', async () => {
    const path = 'src/group-00000/perf-created.ts';
    const runtime = setup(new Map([[`/fixture/${path}`, new Uint8Array()]]));

    await restoreExplorerMutation(
      createFileMutationTarget('create'),
      workspaceFolderUri,
      new Map([[path, { exists: false }]]),
      runtime,
    );

    expect(runtime.waitForWorkbenchDispatchTurn).toHaveBeenCalledOnce();
  });

  it('rejects a restoration workspace edit that VS Code did not apply', async () => {
    const path = 'src/group-00000/perf-created.ts';
    const runtime = setup(new Map([[`/fixture/${path}`, new Uint8Array()]]));
    vi.mocked(runtime.applyDeleteFile).mockResolvedValue(false);

    await expect(restoreExplorerMutation(
      createFileMutationTarget('create'),
      workspaceFolderUri,
      new Map([[path, { exists: false }]]),
      runtime,
    )).rejects.toThrow('VS Code did not restore Explorer create workspace edit');
  });

  it('rejects delete restoration without original bytes', async () => {
    const path = 'src/group-00000/file-000003.ts';

    await expect(restoreExplorerMutation(
      createFileMutationTarget('delete'),
      workspaceFolderUri,
      new Map([[path, { exists: false }]]),
      setup(new Map()),
    )).rejects.toThrow('Explorer delete restoration requires original file bytes');
  });

  it('rejects delete restoration without a deterministic target path', async () => {
    await expect(restoreExplorerMutation({
      scenario: 'delete',
      mutation: { kind: 'delete', paths: [] },
      observedPaths: [],
    }, workspaceFolderUri, new Map(), setup(new Map()))).rejects.toThrow(
      'Explorer delete restoration requires original file bytes',
    );
  });
});
