import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { executeWorkspaceFileMutation } from '../../../../../src/extension/graphView/provider/file/mutations';
import { getUndoManager } from '../../../../../src/extension/undoManager';
import {
  armWorkspaceRefreshIdleWait,
  waitForWorkspaceRefreshIdle,
} from '../../../../../src/extension/workspaceFiles/refresh/scheduler';
import {
  createFileMutationRefreshIdleArm,
  createFileMutationRefreshIdleWaiter,
  focusFileMutationWorkspaceEditor,
  fileMutationScenarioRuntime,
} from '../../../../../src/extension/perf/scenarios/fileMutation/runtime';

vi.mock('vscode', () => ({
  ViewColumn: {
    One: 1,
  },
  Uri: {
    joinPath: vi.fn((base: { fsPath: string }, path: string) => ({
      fsPath: `${base.fsPath}/${path}`,
    })),
  },
  workspace: {
    fs: {
      readFile: vi.fn(),
      stat: vi.fn(),
    },
  },
  window: {
    showTextDocument: vi.fn(),
    visibleTextEditors: [],
  },
}));

vi.mock('../../../../../src/extension/graphView/provider/file/mutations', () => ({
  executeWorkspaceFileMutation: vi.fn(),
}));

vi.mock('../../../../../src/extension/undoManager', () => ({
  getUndoManager: vi.fn(),
}));

vi.mock('../../../../../src/extension/workspaceFiles/refresh/scheduler', () => ({
  armWorkspaceRefreshIdleWait: vi.fn(),
  waitForWorkspaceRefreshIdle: vi.fn(),
}));

describe('extension/perf/scenarios/fileMutation/runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads an existing workspace file', async () => {
    const contents = new Uint8Array([1, 2, 3]);
    vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({} as vscode.FileStat);
    vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(contents);

    await expect(fileMutationScenarioRuntime.readFile(
      { fsPath: '/fixture' } as vscode.Uri,
      'src/file.ts',
    )).resolves.toBe(contents);

    expect(vscode.workspace.fs.readFile).toHaveBeenCalledWith({
      fsPath: '/fixture/src/file.ts',
    });
  });

  it('reports a missing workspace file', async () => {
    vi.mocked(vscode.workspace.fs.stat).mockRejectedValue(new Error('missing'));

    await expect(fileMutationScenarioRuntime.readFile(
      { fsPath: '/fixture' } as vscode.Uri,
      'src/missing.ts',
    )).resolves.toBeUndefined();

    expect(vscode.workspace.fs.readFile).not.toHaveBeenCalled();
  });

  it('delegates to the production mutation seam', async () => {
    const mutation = { kind: 'create' as const, filePath: 'src/new.ts' };
    const context = {
      workspaceFolderUri: { fsPath: '/fixture' } as vscode.Uri,
      refreshGraph: vi.fn(async () => undefined),
    };

    await fileMutationScenarioRuntime.executeMutation(mutation, context);

    expect(executeWorkspaceFileMutation).toHaveBeenCalledWith(mutation, context);
  });

  it('delegates restoration to UndoManager', async () => {
    const undo = vi.fn(async () => 'Create: new.ts');
    vi.mocked(getUndoManager).mockReturnValue({ undo } as never);

    await expect(fileMutationScenarioRuntime.undoLastMutation())
      .resolves.toBe('Create: new.ts');
    expect(undo).toHaveBeenCalledOnce();
  });

  it('focuses the workspace editor group before a production mutation', async () => {
    const document = { uri: { fsPath: '/fixture/untitled' } } as vscode.TextDocument;
    (vscode.window.visibleTextEditors as unknown as vscode.TextEditor[]) = [{
      document,
      viewColumn: vscode.ViewColumn.One,
    } as vscode.TextEditor];
    vi.mocked(vscode.window.showTextDocument).mockResolvedValue({} as vscode.TextEditor);

    await focusFileMutationWorkspaceEditor();

    expect(vscode.window.showTextDocument).toHaveBeenCalledWith(document, {
      preserveFocus: false,
      preview: false,
      viewColumn: vscode.ViewColumn.One,
    });
  });

  it('rejects a mutation when the workspace editor group is missing', async () => {
    (vscode.window.visibleTextEditors as unknown as vscode.TextEditor[]) = [];

    await expect(focusFileMutationWorkspaceEditor()).rejects.toThrow(
      'Performance file mutation requires a visible workspace editor in column one',
    );

    expect(vscode.window.showTextDocument).not.toHaveBeenCalled();
  });

  it('creates the production 32ms refresh-idle waiter', async () => {
    const provider = { isGraphOpen: vi.fn() };
    vi.mocked(waitForWorkspaceRefreshIdle).mockResolvedValue(undefined);

    await createFileMutationRefreshIdleWaiter(provider as never)();

    expect(waitForWorkspaceRefreshIdle).toHaveBeenCalledWith(
      provider,
      { quietMs: 32 },
    );
  });

  it('creates a bounded refresh-idle arm before a production mutation', async () => {
    const provider = { isGraphOpen: vi.fn() };
    const refreshIdle = { dispose: vi.fn(), promise: Promise.resolve() };
    vi.mocked(armWorkspaceRefreshIdleWait).mockReturnValue(refreshIdle);

    expect(createFileMutationRefreshIdleArm(provider as never)()).toBe(refreshIdle);
    expect(armWorkspaceRefreshIdleWait).toHaveBeenCalledWith(
      provider,
      { quietMs: 32, timeoutMs: 30_000 },
    );
  });
});
