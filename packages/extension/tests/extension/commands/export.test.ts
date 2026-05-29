import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { getExportCommands } from '../../../src/extension/commands/export';

function makeProvider() {
  return {
    undo: vi.fn(),
    redo: vi.fn(),
    requestExportPng: vi.fn(),
    requestExportSvg: vi.fn(),
    requestExportJpeg: vi.fn(),
    requestExportJson: vi.fn(),
    requestExportMarkdown: vi.fn(),
    clearCacheAndRefresh: vi.fn().mockResolvedValue(undefined),
  };
}

describe('getExportCommands', () => {

    beforeEach(() => {
      vi.clearAllMocks();
    });



    it('returns all expected command definitions', () => {
      const provider = makeProvider();
      const commands = getExportCommands(provider as never);

      const ids = commands.map((cmd) => cmd.id);
      expect(ids).toContain('codegraphy.undo');
      expect(ids).toContain('codegraphy.redo');
      expect(ids).toContain('codegraphy.exportPng');
      expect(ids).toContain('codegraphy.exportSvg');
      expect(ids).toContain('codegraphy.exportJpeg');
      expect(ids).toContain('codegraphy.exportJson');
      expect(ids).toContain('codegraphy.exportMarkdown');
      expect(ids).toContain('codegraphy.clearCache');
    });

  describe('undo command', () => {

        it('shows the undo description when undo returns a result', async () => {
          const provider = makeProvider();
          provider.undo.mockResolvedValue('Move node');
          const commands = getExportCommands(provider as never);
          const undoCmd = commands.find((cmd) => cmd.id === 'codegraphy.undo')!;

          await undoCmd.handler();

          expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Undo: Move node');
        });



        it('shows nothing-to-undo message when undo returns undefined', async () => {
          const provider = makeProvider();
          provider.undo.mockResolvedValue(undefined);
          const commands = getExportCommands(provider as never);
          const undoCmd = commands.find((cmd) => cmd.id === 'codegraphy.undo')!;

          await undoCmd.handler();

          expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Nothing to undo');
        });



        it('shows nothing-to-undo message when undo returns null', async () => {
          const provider = makeProvider();
          provider.undo.mockResolvedValue(null);
          const commands = getExportCommands(provider as never);
          const undoCmd = commands.find((cmd) => cmd.id === 'codegraphy.undo')!;

          await undoCmd.handler();

          expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Nothing to undo');
        });



        it('shows nothing-to-undo message when undo returns empty string', async () => {
          const provider = makeProvider();
          provider.undo.mockResolvedValue('');
          const commands = getExportCommands(provider as never);
          const undoCmd = commands.find((cmd) => cmd.id === 'codegraphy.undo')!;

          await undoCmd.handler();

          expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Nothing to undo');
        });
  });
});
