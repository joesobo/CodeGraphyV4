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

describe('ToggleFavoriteAction', () => {
  let mockConfigUpdate: ReturnType<typeof vi.fn>;
  let currentFavorites: string[];
  let mockSendFavorites: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    currentFavorites = [];
    mockSendFavorites = vi.fn();
    mockConfigUpdate = vi.fn().mockResolvedValue(undefined);

    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, defaultValue: unknown) => {
        if (key === 'favorites') return [...currentFavorites];
        return defaultValue;
      }),
      update: mockConfigUpdate,
    } as unknown as vscode.WorkspaceConfiguration);
  });

  describe('description', () => {
    it('describes toggling a single file using the filename', () => {
      const action = new ToggleFavoriteAction(['src/utils/helper.ts'], mockSendFavorites);
      expect(action.description).toBe('Toggle favorite: helper.ts');
    });

    it('describes toggling multiple files with a count', () => {
      const action = new ToggleFavoriteAction(['a.ts', 'b.ts', 'c.ts'], mockSendFavorites);
      expect(action.description).toBe('Toggle 3 favorites');
    });

    it('describes toggling two files with a count', () => {
      const action = new ToggleFavoriteAction(['a.ts', 'b.ts'], mockSendFavorites);
      expect(action.description).toBe('Toggle 2 favorites');
    });
  });

  describe('execute', () => {
    it('adds a file to favorites when not already favorited', async () => {
      currentFavorites = [];
      const action = new ToggleFavoriteAction(['src/app.ts'], mockSendFavorites);

      await action.execute();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'favorites',
        expect.arrayContaining(['src/app.ts']),
        vscode.ConfigurationTarget.Workspace
      );
    });

    it('removes a file from favorites when already favorited', async () => {
      currentFavorites = ['src/app.ts', 'src/other.ts'];
      const action = new ToggleFavoriteAction(['src/app.ts'], mockSendFavorites);

      await action.execute();

      const updateArg = mockConfigUpdate.mock.calls[0][1] as string[];
      expect(updateArg).not.toContain('src/app.ts');
      expect(updateArg).toContain('src/other.ts');
    });

    it('toggles multiple paths in a single execute', async () => {
      currentFavorites = ['src/app.ts'];
      const action = new ToggleFavoriteAction(['src/app.ts', 'src/new.ts'], mockSendFavorites);

      await action.execute();

      const updateArg = mockConfigUpdate.mock.calls[0][1] as string[];
      // app.ts was favorited, so should be removed
      expect(updateArg).not.toContain('src/app.ts');
      // new.ts was not favorited, so should be added
      expect(updateArg).toContain('src/new.ts');
    });

    it('calls sendFavorites after updating config', async () => {
      const action = new ToggleFavoriteAction(['src/app.ts'], mockSendFavorites);

      await action.execute();

      expect(mockSendFavorites).toHaveBeenCalledOnce();
    });

    it('captures before state only on first execution', async () => {
      currentFavorites = [];
      const action = new ToggleFavoriteAction(['src/app.ts'], mockSendFavorites);

      await action.execute();

      // Simulate external modification
      currentFavorites = ['src/app.ts', 'src/extra.ts'];

      // Re-execute (redo) should use the same after state
      await action.execute();

      const firstCallArg = mockConfigUpdate.mock.calls[0][1];
      const secondCallArg = mockConfigUpdate.mock.calls[1][1];
      expect(secondCallArg).toEqual(firstCallArg);
    });
  });

  describe('undo', () => {
    it('restores favorites to the state before execute', async () => {
      currentFavorites = ['src/existing.ts'];
      const action = new ToggleFavoriteAction(['src/app.ts'], mockSendFavorites);

      await action.execute();
      await action.undo();

      const lastCall = mockConfigUpdate.mock.calls[mockConfigUpdate.mock.calls.length - 1];
      expect(lastCall[1]).toEqual(['src/existing.ts']);
    });

    it('restores to empty array when originally empty', async () => {
      currentFavorites = [];
      const action = new ToggleFavoriteAction(['src/app.ts'], mockSendFavorites);

      await action.execute();
      await action.undo();

      const lastCall = mockConfigUpdate.mock.calls[mockConfigUpdate.mock.calls.length - 1];
      expect(lastCall[1]).toEqual([]);
    });

    it('calls sendFavorites after restoring', async () => {
      const action = new ToggleFavoriteAction(['src/app.ts'], mockSendFavorites);

      await action.execute();
      mockSendFavorites.mockClear();
      await action.undo();

      expect(mockSendFavorites).toHaveBeenCalledOnce();
    });
  });

  describe('redo (execute after undo)', () => {
    it('reapplies the same after state on redo', async () => {
      currentFavorites = [];
      const action = new ToggleFavoriteAction(['src/app.ts'], mockSendFavorites);

      await action.execute();
      const firstAfter = mockConfigUpdate.mock.calls[0][1];

      await action.undo();
      await action.execute();

      const redoAfter = mockConfigUpdate.mock.calls[2][1];
      expect(redoAfter).toEqual(firstAfter);
    });
  });
});
