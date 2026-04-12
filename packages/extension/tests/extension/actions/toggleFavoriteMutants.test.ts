/**
 * @fileoverview Additional tests for ToggleFavoriteAction targeting surviving mutants.
 *
 * Surviving mutants:
 * - L18:36, L20:35 ArrayDeclaration: initial _stateBefore/_stateAfter = []
 * - L39:54 StringLiteral: config section 'codegraphy' in execute
 * - L66:54 StringLiteral: config section 'codegraphy' in undo
 * - L40:64 ArrayDeclaration: default [] in config.get('favorites', [])
 * - L69:25 StringLiteral: config key 'favorites' in undo update
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ToggleFavoriteAction } from '../../../src/extension/actions/toggleFavorite';

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
}));

describe('ToggleFavoriteAction (mutant coverage)', () => {
  let mockConfigGet: ReturnType<typeof vi.fn>;
  let mockConfigUpdate: ReturnType<typeof vi.fn>;
  let mockSendFavorites: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigGet = vi.fn().mockReturnValue([]);
    mockConfigUpdate = vi.fn().mockResolvedValue(undefined);
    mockSendFavorites = vi.fn();

    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: mockConfigGet,
      update: mockConfigUpdate,
    } as unknown as vscode.WorkspaceConfiguration);
  });

  describe('config section string', () => {
    it('calls getConfiguration with codegraphy during execute', async () => {
      const action = new ToggleFavoriteAction(['file.ts'], mockSendFavorites);

      await action.execute();

      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('codegraphy');
    });

    it('calls getConfiguration with codegraphy during undo', async () => {
      const action = new ToggleFavoriteAction(['file.ts'], mockSendFavorites);

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
      const action = new ToggleFavoriteAction(['file.ts'], mockSendFavorites);

      await action.execute();

      expect(mockConfigGet).toHaveBeenCalledWith('favorites', []);
    });
  });

  describe('config update key in undo', () => {
    it('updates the favorites config key during undo', async () => {
      const action = new ToggleFavoriteAction(['file.ts'], mockSendFavorites);

      await action.execute();
      mockConfigUpdate.mockClear();
      await action.undo();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'favorites',
        expect.any(Array),
        undefined,
      );
    });

    it('updates the favorites config key during execute', async () => {
      const action = new ToggleFavoriteAction(['file.ts'], mockSendFavorites);

      await action.execute();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'favorites',
        expect.any(Array),
        undefined,
      );
    });
  });

  describe('initial state arrays are empty', () => {
    it('undo before execute restores an empty favorites list', async () => {
      const action = new ToggleFavoriteAction(['file.ts'], mockSendFavorites);

      // Undo without execute: _stateBefore should be [] (empty default)
      await action.undo();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'favorites',
        [],
        undefined,
      );
    });

    it('undo after adding a favorite restores the original empty list', async () => {
      mockConfigGet.mockReturnValue([]);
      const action = new ToggleFavoriteAction(['new-fav.ts'], mockSendFavorites);

      await action.execute();

      // Execute should add the file
      const executeCall = mockConfigUpdate.mock.calls[0];
      expect(executeCall[1]).toContain('new-fav.ts');

      await action.undo();

      // Undo should restore to empty
      const undoCall = mockConfigUpdate.mock.calls[1];
      expect(undoCall[1]).toEqual([]);
    });

    it('undo after removing a favorite restores the original list with that favorite', async () => {
      mockConfigGet.mockReturnValue(['existing.ts']);
      const action = new ToggleFavoriteAction(['existing.ts'], mockSendFavorites);

      await action.execute();

      // Execute should remove the file
      const executeCall = mockConfigUpdate.mock.calls[0];
      expect(executeCall[1]).not.toContain('existing.ts');

      await action.undo();

      // Undo should restore it
      const undoCall = mockConfigUpdate.mock.calls[1];
      expect(undoCall[1]).toContain('existing.ts');
    });
  });
});
