import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import { createExplorerMutationAdapter } from '../../../../src/extension/perf/explorer/adapter';
import { createFileMutationTarget } from '../../../../src/extension/perf/scenarios/fileMutation/targets';
import type { ExplorerComparisonRuntime } from '../../../../src/extension/perf/explorer/runtime';

function setup() {
  const listeners: {
    rename?: (event: vscode.FileRenameEvent) => void;
    create?: (event: vscode.FileCreateEvent) => void;
    delete?: (event: vscode.FileDeleteEvent) => void;
  } = {};
  const runtime = {
    applyRenameFile: vi.fn(async () => true),
    applyCreateFile: vi.fn(async () => true),
    applyDeleteFile: vi.fn(async () => true),
    joinPath: vi.fn((_workspace, path: string) => ({ fsPath: `/fixture/${path}` })),
    onDidRenameFiles: vi.fn((listener: (event: vscode.FileRenameEvent) => void) => {
      listeners.rename = listener;
      return { dispose: vi.fn() };
    }),
    onDidCreateFiles: vi.fn((listener: (event: vscode.FileCreateEvent) => void) => {
      listeners.create = listener;
      return { dispose: vi.fn() };
    }),
    onDidDeleteFiles: vi.fn((listener: (event: vscode.FileDeleteEvent) => void) => {
      listeners.delete = listener;
      return { dispose: vi.fn() };
    }),
  } as unknown as ExplorerComparisonRuntime;
  return { listeners, runtime };
}

const workspaceFolderUri = { fsPath: '/fixture' } as vscode.Uri;

describe('extension/perf/explorer/adapter', () => {
  it.each([
    ['rename', '/fixture/src/group-00000/file-000004.perf-renamed.ts'],
    ['create', '/fixture/src/group-00000/perf-created.ts'],
    ['delete', '/fixture/src/group-00000'],
  ] as const)('reveals the visible Explorer row after %s', (scenario, expectedPath) => {
    const { runtime } = setup();

    const adapter = createExplorerMutationAdapter(
      createFileMutationTarget(scenario),
      workspaceFolderUri,
      runtime,
    );

    expect(adapter.visibilityUri.fsPath).toBe(expectedPath);
  });

  it('adapts rename workspace events and edits', async () => {
    const { listeners, runtime } = setup();
    const adapter = createExplorerMutationAdapter(
      createFileMutationTarget('rename'),
      workspaceFolderUri,
      runtime,
    );
    const receive = vi.fn();
    adapter.subscribe(receive);

    expect(adapter.label).toBe('rename');

    listeners.rename?.({ files: [{
      oldUri: { fsPath: '/fixture/src/unrelated.ts' },
      newUri: { fsPath: '/fixture/src/other.ts' },
    }] } as unknown as vscode.FileRenameEvent);
    const matchingEvent = { files: [{
      oldUri: { fsPath: '/fixture/src/group-00000/file-000004.ts' },
      newUri: { fsPath: '/fixture/src/group-00000/file-000004.perf-renamed.ts' },
    }] } as unknown as vscode.FileRenameEvent;
    listeners.rename?.(matchingEvent);

    expect(adapter.matches(receive.mock.calls[0][0])).toBe(false);
    expect(adapter.matches(receive.mock.calls[1][0])).toBe(true);
    expect(adapter.matches({ files: [
      {
        oldUri: { fsPath: '/fixture/src/unrelated.ts' },
        newUri: { fsPath: '/fixture/src/other.ts' },
      },
      matchingEvent.files[0],
    ] } as unknown as vscode.FileRenameEvent)).toBe(true);
    expect(adapter.matches({ files: [{
      oldUri: { fsPath: '/fixture/src/group-00000/file-000004.ts' },
      newUri: { fsPath: '/fixture/src/wrong.ts' },
    }] } as unknown as vscode.FileRenameEvent)).toBe(false);
    await adapter.apply();
    expect(runtime.applyRenameFile).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: '/fixture/src/group-00000/file-000004.ts' }),
      expect.objectContaining({ fsPath: '/fixture/src/group-00000/file-000004.perf-renamed.ts' }),
    );
  });

  it('adapts create workspace events and edits', async () => {
    const { listeners, runtime } = setup();
    const adapter = createExplorerMutationAdapter(
      createFileMutationTarget('create'),
      workspaceFolderUri,
      runtime,
    );
    const receive = vi.fn();
    adapter.subscribe(receive);
    expect(adapter.label).toBe('create');
    listeners.create?.({ files: [{
      fsPath: '/fixture/src/group-00000/perf-created.ts',
    }] } as unknown as vscode.FileCreateEvent);

    expect(adapter.matches(receive.mock.calls[0][0])).toBe(true);
    expect(adapter.matches({ files: [
      { fsPath: '/fixture/src/unrelated.ts' },
      { fsPath: '/fixture/src/group-00000/perf-created.ts' },
    ] } as unknown as vscode.FileCreateEvent)).toBe(true);
    await adapter.apply();
    expect(runtime.applyCreateFile).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: '/fixture/src/group-00000/perf-created.ts' }),
    );
  });

  it('adapts delete workspace events and edits', async () => {
    const { listeners, runtime } = setup();
    const adapter = createExplorerMutationAdapter(
      createFileMutationTarget('delete'),
      workspaceFolderUri,
      runtime,
    );
    const receive = vi.fn();
    adapter.subscribe(receive);
    expect(adapter.label).toBe('delete');
    listeners.delete?.({ files: [{
      fsPath: '/fixture/src/group-00000/file-000003.ts',
    }] } as unknown as vscode.FileDeleteEvent);

    expect(adapter.matches(receive.mock.calls[0][0])).toBe(true);
    expect(adapter.matches({ files: [
      { fsPath: '/fixture/src/unrelated.ts' },
      { fsPath: '/fixture/src/group-00000/file-000003.ts' },
    ] } as unknown as vscode.FileDeleteEvent)).toBe(true);
    await adapter.apply();
    expect(runtime.applyDeleteFile).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: '/fixture/src/group-00000/file-000003.ts' }),
    );
  });

  it('rejects a delete adapter without a deterministic target path', () => {
    const { runtime } = setup();

    expect(() => createExplorerMutationAdapter({
      scenario: 'delete',
      mutation: { kind: 'delete', paths: [] },
      observedPaths: [],
    }, workspaceFolderUri, runtime)).toThrow(
      'Explorer delete comparison requires exactly one target',
    );
  });
});
