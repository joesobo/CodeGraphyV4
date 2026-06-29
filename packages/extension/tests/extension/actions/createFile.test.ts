import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { CreateFileAction } from '../../../src/extension/actions/createFile';

vi.mock('vscode', () => ({
  workspace: {
    fs: {
      createDirectory: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      readDirectory: vi.fn().mockResolvedValue([]),
      stat: vi.fn().mockResolvedValue({}),
    },
    openTextDocument: vi.fn(),
  },
  window: {
    showTextDocument: vi.fn().mockResolvedValue(undefined),
    visibleTextEditors: [] as unknown[],
  },
  commands: {
    executeCommand: vi.fn().mockResolvedValue(undefined),
  },
  Uri: {
    joinPath: vi.fn((base: { fsPath: string }, ...pathSegments: string[]) => ({
      fsPath: `${base.fsPath}/${pathSegments.join('/')}`,
      toString: () => `file://${base.fsPath}/${pathSegments.join('/')}`,
    })),
  },
}));

describe('CreateFileAction', () => {
  const mockWorkspaceFolder = { fsPath: '/workspace' } as vscode.Uri;
  let mockRefreshGraph: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshGraph = vi.fn().mockResolvedValue(undefined);
    vi.mocked(vscode.workspace.fs.readDirectory).mockResolvedValue([]);
    vi.mocked(vscode.workspace.fs.stat).mockResolvedValue({} as vscode.FileStat);
    vi.mocked(vscode.Uri.joinPath).mockImplementation((base: { fsPath: string }, ...pathSegments: string[]) => ({
      fsPath: `${base.fsPath}/${pathSegments.join('/')}`,
      toString: () => `file://${base.fsPath}/${pathSegments.join('/')}`,
    }) as vscode.Uri);

    const mockDocument = {
      uri: { toString: () => 'file:///workspace/src/new.ts' },
    };
    vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue(
      mockDocument as unknown as vscode.TextDocument
    );
  });

  describe('description', () => {
    it('uses the filename from the path', () => {
      const action = new CreateFileAction('src/components/Button.tsx', mockWorkspaceFolder, mockRefreshGraph);
      expect(action.description).toBe('Create: Button.tsx');
    });

    it('handles a root-level file path', () => {
      const action = new CreateFileAction('index.ts', mockWorkspaceFolder, mockRefreshGraph);
      expect(action.description).toBe('Create: index.ts');
    });

    it('handles deeply nested file paths', () => {
      const action = new CreateFileAction('a/b/c/d/deep.ts', mockWorkspaceFolder, mockRefreshGraph);
      expect(action.description).toBe('Create: deep.ts');
    });
  });

  describe('execute', () => {
    it('creates the file at the correct URI', async () => {
      const action = new CreateFileAction('src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      expect(vscode.Uri.joinPath).toHaveBeenCalledWith(mockWorkspaceFolder, 'src/new.ts');
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: '/workspace/src/new.ts' }),
        expect.any(Uint8Array)
      );
    });

    it('creates parent directories before creating a nested file', async () => {
      vi.mocked(vscode.workspace.fs.stat).mockRejectedValue(new Error('missing'));
      const action = new CreateFileAction(
        'test/a/b/c/d.ts',
        mockWorkspaceFolder,
        mockRefreshGraph,
      );

      await action.execute();

      expect(vscode.workspace.fs.createDirectory).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: '/workspace/test/a/b/c' }),
      );
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: '/workspace/test/a/b/c/d.ts' }),
        expect.any(Uint8Array),
      );
    });

    it('does not create a parent directory for root-level files', async () => {
      const action = new CreateFileAction('index.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      expect(vscode.workspace.fs.createDirectory).not.toHaveBeenCalled();
    });

    it('writes an empty file', async () => {
      const action = new CreateFileAction('src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      const writeCall = vi.mocked(vscode.workspace.fs.writeFile).mock.calls[0];
      const content = writeCall[1] as Uint8Array;
      expect(content.length).toBe(0);
    });

    it('opens the file in the editor after creation', async () => {
      const action = new CreateFileAction('src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      expect(vscode.workspace.openTextDocument).toHaveBeenCalledOnce();
      expect(vscode.window.showTextDocument).toHaveBeenCalledOnce();
    });

    it('calls refreshGraph after creating and opening the file', async () => {
      const action = new CreateFileAction('src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      expect(mockRefreshGraph).toHaveBeenCalledOnce();
    });

    it.each([
      '',
      '   ',
      '../outside.ts',
      'src/../outside.ts',
      '/absolute.ts',
      'C:/outside.ts',
      'nested\\file.ts',
    ])('rejects unsafe workspace-relative file paths before mutating the filesystem: %j', async (filePath) => {
      const action = new CreateFileAction(filePath, mockWorkspaceFolder, mockRefreshGraph);

      await expect(action.execute()).rejects.toThrow(
        'Enter a relative file path inside the workspace.',
      );

      expect(vscode.workspace.fs.createDirectory).not.toHaveBeenCalled();
      expect(vscode.workspace.fs.writeFile).not.toHaveBeenCalled();
      expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
      expect(vscode.window.showTextDocument).not.toHaveBeenCalled();
      expect(mockRefreshGraph).not.toHaveBeenCalled();
    });
  });

  describe('undo', () => {
    it('closes editors showing the file before deleting', async () => {
      const fileUri = { fsPath: '/workspace/src/new.ts', toString: () => 'file:///workspace/src/new.ts' };
      vi.mocked(vscode.Uri.joinPath).mockReturnValue(fileUri as unknown as vscode.Uri);

      const mockEditor = {
        document: { uri: { toString: () => 'file:///workspace/src/new.ts' } },
      };
      (vscode.window as unknown as { visibleTextEditors: unknown[] }).visibleTextEditors = [mockEditor];

      const action = new CreateFileAction('src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.undo();

      expect(vscode.window.showTextDocument).toHaveBeenCalledWith(
        mockEditor.document,
        { preview: true, preserveFocus: false }
      );
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('workbench.action.closeActiveEditor');
    });

    it('deletes the file to trash', async () => {
      (vscode.window as unknown as { visibleTextEditors: unknown[] }).visibleTextEditors = [];

      const action = new CreateFileAction('src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.undo();

      expect(vscode.workspace.fs.delete).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: '/workspace/src/new.ts' }),
        { useTrash: true }
      );
    });

    it('calls refreshGraph after deletion', async () => {
      (vscode.window as unknown as { visibleTextEditors: unknown[] }).visibleTextEditors = [];

      const action = new CreateFileAction('src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.undo();

      expect(mockRefreshGraph).toHaveBeenCalledOnce();
    });

    it('skips editor closing when no editors show the file', async () => {
      (vscode.window as unknown as { visibleTextEditors: unknown[] }).visibleTextEditors = [
        { document: { uri: { toString: () => 'file:///workspace/other.ts' } } },
      ];

      const action = new CreateFileAction('src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.undo();

      expect(vscode.commands.executeCommand).not.toHaveBeenCalledWith('workbench.action.closeActiveEditor');
      expect(vscode.workspace.fs.delete).toHaveBeenCalledOnce();
    });

    it('removes created parent directories when undoing a nested file create', async () => {
      vi.mocked(vscode.workspace.fs.stat).mockImplementation(async (uri: vscode.Uri) => {
        if (uri.fsPath === '/workspace/test') {
          return {} as vscode.FileStat;
        }

        throw new Error('missing');
      });

      const action = new CreateFileAction(
        'test/a/b/c/d.ts',
        mockWorkspaceFolder,
        mockRefreshGraph,
      );

      await action.execute();
      vi.mocked(vscode.workspace.fs.delete).mockClear();
      mockRefreshGraph.mockClear();

      await action.undo();

      expect(vscode.workspace.fs.delete).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ fsPath: '/workspace/test/a/b/c/d.ts' }),
        { useTrash: true },
      );
      expect(vscode.workspace.fs.delete).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ fsPath: '/workspace/test/a/b/c' }),
        { recursive: false, useTrash: true },
      );
      expect(vscode.workspace.fs.delete).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ fsPath: '/workspace/test/a/b' }),
        { recursive: false, useTrash: true },
      );
      expect(vscode.workspace.fs.delete).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({ fsPath: '/workspace/test/a' }),
        { recursive: false, useTrash: true },
      );
      expect(vscode.workspace.fs.delete).toHaveBeenCalledTimes(4);
      expect(mockRefreshGraph).toHaveBeenCalledOnce();
    });

    it('keeps created parent directories that are no longer empty on undo', async () => {
      vi.mocked(vscode.workspace.fs.stat).mockRejectedValue(new Error('missing'));
      vi.mocked(vscode.workspace.fs.readDirectory).mockImplementation(async (uri: vscode.Uri) => {
        if (uri.fsPath === '/workspace/test/a/b/c') {
          return [['later.ts', 1 as vscode.FileType]];
        }

        return [];
      });

      const action = new CreateFileAction(
        'test/a/b/c/d.ts',
        mockWorkspaceFolder,
        mockRefreshGraph,
      );

      await action.execute();
      vi.mocked(vscode.workspace.fs.delete).mockClear();

      await action.undo();

      expect(vscode.workspace.fs.delete).toHaveBeenCalledOnce();
      expect(vscode.workspace.fs.delete).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: '/workspace/test/a/b/c/d.ts' }),
        { useTrash: true },
      );
    });
  });
});
