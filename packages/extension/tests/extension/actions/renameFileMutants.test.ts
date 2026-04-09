/**
 * @fileoverview Additional tests for RenameFileAction targeting surviving mutants.
 *
 * Surviving mutants:
 * - L18:40, L20:39 ArrayDeclaration: initial _favoritesBefore/_favoritesAfter = []
 * - L46:54 StringLiteral: config section 'codegraphy' in execute
 * - L47:64 ArrayDeclaration: default [] in config.get('favorites', [])
 * - L82:56 StringLiteral: config section 'codegraphy' in undo
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { RenameFileAction } from '../../../src/extension/actions/renameFile';

vi.mock('vscode', () => ({
  workspace: {
    fs: {
      rename: vi.fn().mockResolvedValue(undefined),
    },
    getConfiguration: vi.fn(),
  },
  Uri: {
    joinPath: vi.fn((base: { fsPath: string }, ...pathSegments: string[]) => ({
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

describe('RenameFileAction (mutant coverage)', () => {
  const mockWorkspaceFolder = { fsPath: '/workspace' } as vscode.Uri;
  let mockRefreshGraph: ReturnType<typeof vi.fn>;
  let mockConfigGet: ReturnType<typeof vi.fn>;
  let mockConfigUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshGraph = vi.fn().mockResolvedValue(undefined);
    mockConfigGet = vi.fn().mockReturnValue([]);
    mockConfigUpdate = vi.fn().mockResolvedValue(undefined);

    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: mockConfigGet,
      update: mockConfigUpdate,
    } as unknown as vscode.WorkspaceConfiguration);
  });

  describe('config section string', () => {
    it('calls getConfiguration with codegraphy during execute', async () => {
      const action = new RenameFileAction(
        'old.ts', 'new.ts', mockWorkspaceFolder, mockRefreshGraph
      );

      await action.execute();

      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('codegraphy');
    });

    it('calls getConfiguration with codegraphy during undo when file was favorited', async () => {
      mockConfigGet.mockReturnValue(['old.ts']);
      const action = new RenameFileAction(
        'old.ts', 'new.ts', mockWorkspaceFolder, mockRefreshGraph
      );

      await action.execute();
      vi.mocked(vscode.workspace.getConfiguration).mockClear();
      vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
        get: mockConfigGet,
        update: mockConfigUpdate,
      } as unknown as vscode.WorkspaceConfiguration);

      await action.undo();

      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('codegraphy');
    });
  });

  describe('config get key and default value', () => {
    it('reads the favorites key with an empty array default', async () => {
      const action = new RenameFileAction(
        'old.ts', 'new.ts', mockWorkspaceFolder, mockRefreshGraph
      );

      await action.execute();

      expect(mockConfigGet).toHaveBeenCalledWith('favorites', []);
    });
  });

  describe('config update key', () => {
    it('updates the favorites config key during execute when file is favorited', async () => {
      mockConfigGet.mockReturnValue(['old.ts']);
      const action = new RenameFileAction(
        'old.ts', 'new.ts', mockWorkspaceFolder, mockRefreshGraph
      );

      await action.execute();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'favorites',
        expect.any(Array),
        undefined,
      );
    });

    it('updates the favorites config key during undo when file was favorited', async () => {
      mockConfigGet.mockReturnValue(['old.ts']);
      const action = new RenameFileAction(
        'old.ts', 'new.ts', mockWorkspaceFolder, mockRefreshGraph
      );

      await action.execute();
      mockConfigUpdate.mockClear();
      await action.undo();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'favorites',
        expect.any(Array),
        undefined,
      );
    });
  });

  describe('initial state arrays are empty', () => {
    it('does not update favorites on undo when the file was never favorited', async () => {
      mockConfigGet.mockReturnValue([]);
      const action = new RenameFileAction(
        'old.ts', 'new.ts', mockWorkspaceFolder, mockRefreshGraph
      );

      await action.execute();
      mockConfigUpdate.mockClear();
      await action.undo();

      // _favoritesBefore is [] and does not include 'old.ts', so no config update
      expect(mockConfigUpdate).not.toHaveBeenCalled();
    });

    it('undo restores correct favorites when file was in favorites', async () => {
      mockConfigGet.mockReturnValue(['old.ts', 'other.ts']);
      const action = new RenameFileAction(
        'old.ts', 'new.ts', mockWorkspaceFolder, mockRefreshGraph
      );

      await action.execute();

      // Execute should update favorites with old.ts replaced by new.ts
      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'favorites',
        ['new.ts', 'other.ts'],
        undefined,
      );

      // Undo should restore original favorites
      await action.undo();
      const undoCall = mockConfigUpdate.mock.calls[mockConfigUpdate.mock.calls.length - 1];
      expect(undoCall[1]).toEqual(['old.ts', 'other.ts']);
    });
  });
});
