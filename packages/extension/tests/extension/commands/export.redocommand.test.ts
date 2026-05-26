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

  describe('redo command', () => {

        it('shows the redo description when redo returns a result', async () => {
          const provider = makeProvider();
          provider.redo.mockResolvedValue('Move node');
          const commands = getExportCommands(provider as never);
          const redoCmd = commands.find((cmd) => cmd.id === 'codegraphy.redo')!;

          await redoCmd.handler();

          expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Redo: Move node');
        });



        it('shows nothing-to-redo message when redo returns undefined', async () => {
          const provider = makeProvider();
          provider.redo.mockResolvedValue(undefined);
          const commands = getExportCommands(provider as never);
          const redoCmd = commands.find((cmd) => cmd.id === 'codegraphy.redo')!;

          await redoCmd.handler();

          expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Nothing to redo');
        });



        it('shows nothing-to-redo message when redo returns null', async () => {
          const provider = makeProvider();
          provider.redo.mockResolvedValue(null);
          const commands = getExportCommands(provider as never);
          const redoCmd = commands.find((cmd) => cmd.id === 'codegraphy.redo')!;

          await redoCmd.handler();

          expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Nothing to redo');
        });



        it('shows nothing-to-redo message when redo returns empty string', async () => {
          const provider = makeProvider();
          provider.redo.mockResolvedValue('');
          const commands = getExportCommands(provider as never);
          const redoCmd = commands.find((cmd) => cmd.id === 'codegraphy.redo')!;

          await redoCmd.handler();

          expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Nothing to redo');
        });
  });
});
