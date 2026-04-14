/**
 * @fileoverview Additional tests for AddToExcludeAction targeting surviving mutants.
 *
 * Surviving mutants:
 * - L18:36, L20:35 ArrayDeclaration: initial _stateBefore/_stateAfter = []
 * - L39:54 StringLiteral: config section 'codegraphy'
 * - L40:60 ArrayDeclaration: default [] in config.get('filterPatterns', [])
 * - L62:54 StringLiteral: config section 'codegraphy' in undo
 * - L65:25 StringLiteral: pattern prefix in undo path
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { AddToExcludeAction } from '../../../src/extension/actions/addToExclude';

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

function getLastFilterPatternUpdate(
  calls: Array<[string, unknown, unknown?]>,
): [string, unknown, unknown?] | undefined {
  return [...calls]
    .reverse()
    .find(([key]) => key === 'filterPatterns');
}

describe('AddToExcludeAction (mutant coverage)', () => {
  let mockConfigGet: ReturnType<typeof vi.fn>;
  let mockConfigUpdate: ReturnType<typeof vi.fn>;
  let mockRefreshGraph: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigGet = vi.fn().mockReturnValue([]);
    mockConfigUpdate = vi.fn().mockResolvedValue(undefined);
    mockRefreshGraph = vi.fn().mockResolvedValue(undefined);

    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: mockConfigGet,
      update: mockConfigUpdate,
    } as unknown as vscode.WorkspaceConfiguration);
  });

  describe('config section string', () => {
    it('calls getConfiguration with codegraphy during execute', async () => {
      const action = new AddToExcludeAction(['file.ts'], mockRefreshGraph);

      await action.execute();

      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('codegraphy');
    });

    it('calls getConfiguration with codegraphy during undo', async () => {
      const action = new AddToExcludeAction(['file.ts'], mockRefreshGraph);

      await action.execute();
      vi.mocked(vscode.workspace.getConfiguration).mockClear();
      await action.undo();

      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('codegraphy');
    });
  });

  describe('config get key and default value', () => {
    it('reads the filterPatterns key with an empty array default', async () => {
      const action = new AddToExcludeAction(['file.ts'], mockRefreshGraph);

      await action.execute();

      expect(mockConfigGet).toHaveBeenCalledWith('filterPatterns', []);
    });
  });

  describe('config update key', () => {
    it('updates the filterPatterns config key during execute', async () => {
      const action = new AddToExcludeAction(['file.ts'], mockRefreshGraph);

      await action.execute();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'filterPatterns',
        expect.any(Array),
        undefined,
      );
    });

    it('does not write a second legacy exclude key during execute', async () => {
      const action = new AddToExcludeAction(['file.ts'], mockRefreshGraph);

      await action.execute();

      expect(mockConfigUpdate).not.toHaveBeenCalledWith(
        'exclude',
        expect.any(Array),
        undefined,
      );
    });

    it('updates the filterPatterns config key during undo', async () => {
      const action = new AddToExcludeAction(['file.ts'], mockRefreshGraph);

      await action.execute();
      mockConfigUpdate.mockClear();
      await action.undo();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'filterPatterns',
        expect.any(Array),
        undefined,
      );
    });

    it('does not write a second legacy exclude key during undo', async () => {
      const action = new AddToExcludeAction(['file.ts'], mockRefreshGraph);

      await action.execute();
      mockConfigUpdate.mockClear();
      await action.undo();

      expect(mockConfigUpdate).not.toHaveBeenCalledWith(
        'exclude',
        expect.any(Array),
        undefined,
      );
    });
  });

  describe('glob pattern prefix', () => {
    it('prepends **/ to each path to create a glob pattern', async () => {
      const action = new AddToExcludeAction(['src/utils.ts'], mockRefreshGraph);

      await action.execute();

      const updatedExclude = mockConfigUpdate.mock.calls.find(
        ([key]) => key === 'filterPatterns',
      )?.[1] as string[];
      expect(updatedExclude).toContain('**/src/utils.ts');
      // Verify the exact prefix, not just containment
      const pattern = updatedExclude.find(pat => pat.includes('utils.ts'));
      expect(pattern).toBe('**/src/utils.ts');
    });

    it('creates correct glob pattern for a simple filename', async () => {
      const action = new AddToExcludeAction(['app.ts'], mockRefreshGraph);

      await action.execute();

      const updatedExclude = mockConfigUpdate.mock.calls.find(
        ([key]) => key === 'filterPatterns',
      )?.[1] as string[];
      expect(updatedExclude).toEqual(['**/app.ts']);
    });
  });

  describe('initial state arrays are empty', () => {
    it('undo before execute restores an empty filter pattern list', async () => {
      const action = new AddToExcludeAction(['file.ts'], mockRefreshGraph);

      // Undo without execute: _stateBefore should be [] (empty default)
      await action.undo();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'filterPatterns',
        [],
        undefined,
      );
    });

    it('undo after execute restores the captured before-state not the initial array', async () => {
      // Start with existing filter patterns
      mockConfigGet.mockImplementation((key: string) =>
        key === 'filterPatterns' ? ['**/existing.ts'] : [],
      );

      const action = new AddToExcludeAction(['new.ts'], mockRefreshGraph);

      await action.execute();
      await action.undo();

      // The undo call should restore the original filter pattern list
      const undoCallArgs = getLastFilterPatternUpdate(
        mockConfigUpdate.mock.calls as Array<[string, unknown, unknown?]>,
      );
      expect(undoCallArgs).toBeDefined();
      if (!undoCallArgs) {
        throw new Error('expected filterPatterns undo call');
      }
      expect(undoCallArgs[1]).toEqual(['**/existing.ts']);
    });
  });
});
