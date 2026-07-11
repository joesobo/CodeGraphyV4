import { afterEach, describe, expect, it, vi } from 'vitest';

describe('graphView/provider/file/mutations', () => {
  afterEach(() => {
    vi.doUnmock('../../../../../src/extension/actions/renameFile');
    vi.doUnmock('../../../../../src/extension/actions/createFile');
    vi.doUnmock('../../../../../src/extension/actions/deleteFiles');
    vi.doUnmock('../../../../../src/extension/undoManager');
    vi.resetModules();
  });

  it('renames through the production undo path and refreshes the graph', async () => {
    const refreshGraph = vi.fn(async () => undefined);
    const execute = vi.fn(async (action: { execute(): Promise<void> }) => {
      await action.execute();
    });
    const RenameFileAction = vi.fn(function (
      this: { execute(): Promise<void>; undo(): Promise<void>; description: string },
      _oldPath: string,
      _newPath: string,
      _workspaceFolderUri: { fsPath: string },
      refresh: () => Promise<void>,
    ) {
      this.description = 'rename';
      this.execute = refresh;
      this.undo = vi.fn(async () => undefined);
    });

    vi.doMock('../../../../../src/extension/actions/renameFile', () => ({ RenameFileAction }));
    vi.doMock('../../../../../src/extension/undoManager', () => ({
      getUndoManager: () => ({ execute }),
    }));

    const { executeWorkspaceFileMutation } = await import(
      '../../../../../src/extension/graphView/provider/file/mutations'
    );
    const workspaceFolderUri = { fsPath: '/workspace' };

    await executeWorkspaceFileMutation(
      { kind: 'rename', oldPath: 'src/app.ts', newPath: 'src/main.ts' },
      { workspaceFolderUri: workspaceFolderUri as never, refreshGraph },
    );

    expect(RenameFileAction).toHaveBeenCalledWith(
      'src/app.ts',
      'src/main.ts',
      workspaceFolderUri,
      expect.any(Function),
    );
    expect(execute).toHaveBeenCalledOnce();
    expect(refreshGraph).toHaveBeenCalledOnce();
  });

  it('creates through the production undo path and refreshes the graph', async () => {
    const refreshGraph = vi.fn(async () => undefined);
    const execute = vi.fn(async (action: { execute(): Promise<void> }) => {
      await action.execute();
    });
    const CreateFileAction = vi.fn(function (
      this: { execute(): Promise<void>; undo(): Promise<void>; description: string },
      _filePath: string,
      _workspaceFolderUri: { fsPath: string },
      refresh: () => Promise<void>,
    ) {
      this.description = 'create';
      this.execute = refresh;
      this.undo = vi.fn(async () => undefined);
    });

    vi.doMock('../../../../../src/extension/actions/createFile', () => ({ CreateFileAction }));
    vi.doMock('../../../../../src/extension/undoManager', () => ({
      getUndoManager: () => ({ execute }),
    }));

    const { executeWorkspaceFileMutation } = await import(
      '../../../../../src/extension/graphView/provider/file/mutations'
    );
    const workspaceFolderUri = { fsPath: '/workspace' };

    await executeWorkspaceFileMutation(
      { kind: 'create', filePath: 'src/new.ts' },
      { workspaceFolderUri: workspaceFolderUri as never, refreshGraph },
    );

    expect(CreateFileAction).toHaveBeenCalledWith(
      'src/new.ts',
      workspaceFolderUri,
      expect.any(Function),
    );
    expect(execute).toHaveBeenCalledOnce();
    expect(refreshGraph).toHaveBeenCalledOnce();
  });

  it('deletes through the production undo path and refreshes the graph', async () => {
    const refreshGraph = vi.fn(async () => undefined);
    const execute = vi.fn(async (action: { execute(): Promise<void> }) => {
      await action.execute();
    });
    const DeleteFilesAction = vi.fn(function (
      this: { execute(): Promise<void>; undo(): Promise<void>; description: string },
      _paths: string[],
      _workspaceFolderUri: { fsPath: string },
      refresh: () => Promise<void>,
    ) {
      this.description = 'delete';
      this.execute = refresh;
      this.undo = vi.fn(async () => undefined);
    });

    vi.doMock('../../../../../src/extension/actions/deleteFiles', () => ({ DeleteFilesAction }));
    vi.doMock('../../../../../src/extension/undoManager', () => ({
      getUndoManager: () => ({ execute }),
    }));

    const { executeWorkspaceFileMutation } = await import(
      '../../../../../src/extension/graphView/provider/file/mutations'
    );
    const workspaceFolderUri = { fsPath: '/workspace' };

    await executeWorkspaceFileMutation(
      { kind: 'delete', paths: ['src/app.ts', 'src/main.ts'] },
      { workspaceFolderUri: workspaceFolderUri as never, refreshGraph },
    );

    expect(DeleteFilesAction).toHaveBeenCalledWith(
      ['src/app.ts', 'src/main.ts'],
      workspaceFolderUri,
      expect.any(Function),
    );
    expect(execute).toHaveBeenCalledOnce();
    expect(refreshGraph).toHaveBeenCalledOnce();
  });

  it('publishes optimistic start and rollback messages around a failed action', async () => {
    const failure = new Error('rename failed');
    const execute = vi.fn(async () => { throw failure; });
    const RenameFileAction = vi.fn(function (
      this: { execute(): Promise<void>; undo(): Promise<void>; description: string },
    ) {
      this.description = 'rename';
      this.execute = vi.fn(async () => undefined);
      this.undo = vi.fn(async () => undefined);
    });
    vi.doMock('../../../../../src/extension/actions/renameFile', () => ({ RenameFileAction }));
    vi.doMock('../../../../../src/extension/undoManager', () => ({
      getUndoManager: () => ({ execute }),
    }));
    const { executeWorkspaceFileMutation } = await import(
      '../../../../../src/extension/graphView/provider/file/mutations'
    );
    const sendMessage = vi.fn();

    await expect(executeWorkspaceFileMutation(
      { kind: 'rename', oldPath: 'src/app.ts', newPath: 'src/main.ts' },
      {
        workspaceFolderUri: { fsPath: '/workspace' } as never,
        refreshGraph: vi.fn(async () => undefined),
        sendMessage,
      },
    )).rejects.toThrow('rename failed');

    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      type: 'FILE_MUTATION_STARTED',
      payload: {
        mutationId: expect.any(String),
        mutation: { kind: 'rename', oldPath: 'src/app.ts', newPath: 'src/main.ts' },
      },
    });
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: 'FILE_MUTATION_FAILED',
      payload: { mutationId: expect.any(String), message: 'rename failed' },
    });
  });
});
