/**
 * @fileoverview Tests for file undoable actions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { DeleteFilesAction } from '../../../src/extension/actions/DeleteFilesAction';
import { RenameFileAction } from '../../../src/extension/actions/RenameFileAction';
import { CreateFileAction } from '../../../src/extension/actions/CreateFileAction';
import { ToggleFavoriteAction } from '../../../src/extension/actions/ToggleFavoriteAction';
import { getUndoManager, resetUndoManager } from '../../../src/extension/UndoManager';

// Mock vscode module
vi.mock('vscode', () => ({
  workspace: {
    fs: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      delete: vi.fn(),
      rename: vi.fn(),
    },
    openTextDocument: vi.fn(),
    getConfiguration: vi.fn(() => ({
      get: vi.fn(() => []),
      update: vi.fn().mockResolvedValue(undefined),
    })),
  },
  window: {
    showTextDocument: vi.fn(),
    visibleTextEditors: [],
    showErrorMessage: vi.fn(),
  },
  commands: {
    executeCommand: vi.fn(),
  },
  Uri: {
    joinPath: vi.fn((base, ...pathSegments) => ({
      fsPath: `${base.fsPath}/${pathSegments.join('/')}`,
      toString: () => `file://${base.fsPath}/${pathSegments.join('/')}`,
    })),
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
}));

describe('DeleteFilesAction', () => {
  const mockWorkspaceFolder = { fsPath: '/workspace' } as vscode.Uri;
  let mockRefreshGraph: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshGraph = vi.fn().mockResolvedValue(undefined);
    
    // Setup default mock implementations
    (vscode.workspace.fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Uint8Array([104, 101, 108, 108, 111]) // "hello"
    );
    (vscode.workspace.fs.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (vscode.workspace.fs.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct description for single file', () => {
    const action = new DeleteFilesAction(
      ['src/test.ts'],
      mockWorkspaceFolder,
      mockRefreshGraph
    );
    expect(action.description).toBe('Delete: test.ts');
  });

  it('should have correct description for multiple files', () => {
    const action = new DeleteFilesAction(
      ['src/a.ts', 'src/b.ts', 'src/c.ts'],
      mockWorkspaceFolder,
      mockRefreshGraph
    );
    expect(action.description).toBe('Delete 3 files');
  });

  it('should read file contents before deleting on execute', async () => {
    const action = new DeleteFilesAction(
      ['src/test.ts'],
      mockWorkspaceFolder,
      mockRefreshGraph
    );

    await action.execute();

    expect(vscode.workspace.fs.readFile).toHaveBeenCalledTimes(1);
    expect(vscode.workspace.fs.delete).toHaveBeenCalledTimes(1);
    expect(mockRefreshGraph).toHaveBeenCalledTimes(1);
  });

  it('should restore file contents on undo', async () => {
    const action = new DeleteFilesAction(
      ['src/test.ts'],
      mockWorkspaceFolder,
      mockRefreshGraph
    );

    await action.execute();
    await action.undo();

    expect(vscode.workspace.fs.writeFile).toHaveBeenCalledTimes(1);
    expect(mockRefreshGraph).toHaveBeenCalledTimes(2); // Once for execute, once for undo
  });

  it('should handle multiple files', async () => {
    const action = new DeleteFilesAction(
      ['src/a.ts', 'src/b.ts'],
      mockWorkspaceFolder,
      mockRefreshGraph
    );

    await action.execute();

    expect(vscode.workspace.fs.readFile).toHaveBeenCalledTimes(2);
    expect(vscode.workspace.fs.delete).toHaveBeenCalledTimes(2);
  });
});

describe('RenameFileAction', () => {
  const mockWorkspaceFolder = { fsPath: '/workspace' } as vscode.Uri;
  let mockRefreshGraph: ReturnType<typeof vi.fn>;
  let mockGetConfiguration: ReturnType<typeof vi.fn>;
  let mockConfigUpdate: ReturnType<typeof vi.fn>;
  let currentFavorites: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshGraph = vi.fn().mockResolvedValue(undefined);
    (vscode.workspace.fs.rename as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    
    // Setup configuration mock for favorites
    currentFavorites = [];
    mockConfigUpdate = vi.fn().mockResolvedValue(undefined);
    mockGetConfiguration = vi.fn().mockReturnValue({
      get: vi.fn((key: string, defaultValue: string[] = []) => {
        if (key === 'favorites') return currentFavorites;
        return defaultValue;
      }),
      update: mockConfigUpdate,
    });
    (vscode.workspace as unknown as { getConfiguration: typeof mockGetConfiguration }).getConfiguration = mockGetConfiguration;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct description', () => {
    const action = new RenameFileAction(
      'src/old.ts',
      'src/new.ts',
      mockWorkspaceFolder,
      mockRefreshGraph
    );
    expect(action.description).toBe('Rename: old.ts → new.ts');
  });

  it('should rename file on execute', async () => {
    const action = new RenameFileAction(
      'src/old.ts',
      'src/new.ts',
      mockWorkspaceFolder,
      mockRefreshGraph
    );

    await action.execute();

    expect(vscode.workspace.fs.rename).toHaveBeenCalledTimes(1);
    expect(mockRefreshGraph).toHaveBeenCalledTimes(1);
  });

  it('should reverse rename on undo', async () => {
    const action = new RenameFileAction(
      'src/old.ts',
      'src/new.ts',
      mockWorkspaceFolder,
      mockRefreshGraph
    );

    await action.execute();
    await action.undo();

    // rename should be called twice - once for execute, once for undo (reversed)
    expect(vscode.workspace.fs.rename).toHaveBeenCalledTimes(2);
    expect(mockRefreshGraph).toHaveBeenCalledTimes(2);
  });

  it('should update favorites when renaming a favorited file', async () => {
    // File is in favorites before rename
    currentFavorites = ['src/old.ts', 'other/file.ts'];

    const action = new RenameFileAction(
      'src/old.ts',
      'src/new.ts',
      mockWorkspaceFolder,
      mockRefreshGraph
    );

    await action.execute();

    // Should update favorites with the new path
    expect(mockConfigUpdate).toHaveBeenCalledWith(
      'favorites',
      ['src/new.ts', 'other/file.ts'],
      expect.anything()
    );
  });

  it('should restore favorites when undoing rename of favorited file', async () => {
    // File is in favorites before rename
    currentFavorites = ['src/old.ts', 'other/file.ts'];

    const action = new RenameFileAction(
      'src/old.ts',
      'src/new.ts',
      mockWorkspaceFolder,
      mockRefreshGraph
    );

    await action.execute();
    
    // Simulate that favorites now contain the new path
    currentFavorites = ['src/new.ts', 'other/file.ts'];
    
    await action.undo();

    // Should restore favorites with the old path
    expect(mockConfigUpdate).toHaveBeenLastCalledWith(
      'favorites',
      ['src/old.ts', 'other/file.ts'],
      expect.anything()
    );
  });

  it('should not modify favorites when renaming non-favorited file', async () => {
    // File is NOT in favorites
    currentFavorites = ['other/file.ts'];

    const action = new RenameFileAction(
      'src/old.ts',
      'src/new.ts',
      mockWorkspaceFolder,
      mockRefreshGraph
    );

    await action.execute();

    // Should not update favorites
    expect(mockConfigUpdate).not.toHaveBeenCalled();
  });
});

describe('CreateFileAction', () => {
  const mockWorkspaceFolder = { fsPath: '/workspace' } as vscode.Uri;
  let mockRefreshGraph: ReturnType<typeof vi.fn>;
  let mockDocument: { uri: { toString: () => string } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshGraph = vi.fn().mockResolvedValue(undefined);
    mockDocument = { uri: { toString: () => 'file:///workspace/src/new.ts' } };
    
    (vscode.workspace.fs.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (vscode.workspace.fs.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (vscode.workspace.openTextDocument as ReturnType<typeof vi.fn>).mockResolvedValue(mockDocument);
    (vscode.window.showTextDocument as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct description', () => {
    const action = new CreateFileAction(
      'src/new.ts',
      mockWorkspaceFolder,
      mockRefreshGraph
    );
    expect(action.description).toBe('Create: new.ts');
  });

  it('should create file and open in editor on execute', async () => {
    const action = new CreateFileAction(
      'src/new.ts',
      mockWorkspaceFolder,
      mockRefreshGraph
    );

    await action.execute();

    expect(vscode.workspace.fs.writeFile).toHaveBeenCalledTimes(1);
    expect(vscode.workspace.openTextDocument).toHaveBeenCalledTimes(1);
    expect(vscode.window.showTextDocument).toHaveBeenCalledTimes(1);
    expect(mockRefreshGraph).toHaveBeenCalledTimes(1);
  });

  it('should delete file on undo', async () => {
    const action = new CreateFileAction(
      'src/new.ts',
      mockWorkspaceFolder,
      mockRefreshGraph
    );

    await action.execute();
    
    // Reset mock to not have visible editors
    (vscode.window as { visibleTextEditors: unknown[] }).visibleTextEditors = [];
    
    await action.undo();

    expect(vscode.workspace.fs.delete).toHaveBeenCalledTimes(1);
    expect(mockRefreshGraph).toHaveBeenCalledTimes(2);
  });
});

/**
 * Integration tests for chained undo operations.
 * These test the scenario: favorite → rename → undo → undo
 * Verifies that state-based undo correctly restores favorites.
 */
describe('Chained Undo Operations', () => {
  const mockWorkspaceFolder = { fsPath: '/workspace' } as vscode.Uri;
  let mockRefreshGraph: ReturnType<typeof vi.fn>;
  let mockSendFavorites: ReturnType<typeof vi.fn>;
  let currentFavorites: string[];
  let mockConfigUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetUndoManager();
    currentFavorites = [];
    mockRefreshGraph = vi.fn().mockResolvedValue(undefined);
    mockSendFavorites = vi.fn();
    mockConfigUpdate = vi.fn().mockImplementation((_key, value) => {
      currentFavorites = value;
      return Promise.resolve();
    });

    (vscode.workspace.getConfiguration as ReturnType<typeof vi.fn>).mockReturnValue({
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'favorites') return [...currentFavorites];
        return [];
      }),
      update: mockConfigUpdate,
    });

    (vscode.workspace.fs.rename as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetUndoManager();
  });

  it('should correctly undo chained operations: favorite → rename → undo rename → undo favorite', async () => {
    const undoManager = getUndoManager();
    
    // Step 1: Add file to favorites
    const toggleAction = new ToggleFavoriteAction(['src/app.ts'], mockSendFavorites);
    await undoManager.execute(toggleAction);
    
    expect(currentFavorites).toEqual(['src/app.ts']);
    
    // Step 2: Rename the favorited file
    const renameAction = new RenameFileAction(
      'src/app.ts',
      'src/main.ts',
      mockWorkspaceFolder,
      mockRefreshGraph
    );
    await undoManager.execute(renameAction);
    
    // Favorites should now have the new path
    expect(currentFavorites).toEqual(['src/main.ts']);
    
    // Step 3: Undo the rename
    const undoRenameDesc = await undoManager.undo();
    expect(undoRenameDesc).toBe('Rename: app.ts → main.ts');
    
    // Favorites should be restored to original path
    expect(currentFavorites).toEqual(['src/app.ts']);
    
    // Step 4: Undo the favorite toggle
    const undoFavDesc = await undoManager.undo();
    expect(undoFavDesc).toBe('Toggle favorite: app.ts');
    
    // Favorites should be empty again
    expect(currentFavorites).toEqual([]);
  });

  it('should handle redo after chained undo', async () => {
    const undoManager = getUndoManager();
    
    // Setup: favorite → rename
    const toggleAction = new ToggleFavoriteAction(['src/app.ts'], mockSendFavorites);
    await undoManager.execute(toggleAction);
    
    const renameAction = new RenameFileAction(
      'src/app.ts',
      'src/main.ts',
      mockWorkspaceFolder,
      mockRefreshGraph
    );
    await undoManager.execute(renameAction);
    
    // Undo both
    await undoManager.undo(); // undo rename
    await undoManager.undo(); // undo favorite
    
    expect(currentFavorites).toEqual([]);
    
    // Redo favorite
    await undoManager.redo();
    expect(currentFavorites).toEqual(['src/app.ts']);
    
    // Redo rename
    await undoManager.redo();
    expect(currentFavorites).toEqual(['src/main.ts']);
  });

  it('should maintain state consistency when interleaved with other operations', async () => {
    const undoManager = getUndoManager();
    
    // File A: toggle favorite
    const toggleA = new ToggleFavoriteAction(['src/a.ts'], mockSendFavorites);
    await undoManager.execute(toggleA);
    expect(currentFavorites).toEqual(['src/a.ts']);
    
    // File B: toggle favorite (both A and B now favorited)
    const toggleB = new ToggleFavoriteAction(['src/b.ts'], mockSendFavorites);
    await undoManager.execute(toggleB);
    expect(currentFavorites).toEqual(['src/a.ts', 'src/b.ts']);
    
    // Rename A
    const renameA = new RenameFileAction(
      'src/a.ts',
      'src/a-renamed.ts',
      mockWorkspaceFolder,
      mockRefreshGraph
    );
    await undoManager.execute(renameA);
    expect(currentFavorites).toEqual(['src/a-renamed.ts', 'src/b.ts']);
    
    // Undo rename A
    await undoManager.undo();
    expect(currentFavorites).toEqual(['src/a.ts', 'src/b.ts']);
    
    // Undo toggle B
    await undoManager.undo();
    expect(currentFavorites).toEqual(['src/a.ts']);
    
    // Undo toggle A
    await undoManager.undo();
    expect(currentFavorites).toEqual([]);
  });
});
