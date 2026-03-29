import { describe, it, expect, vi, beforeEach } from 'vitest';
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

  describe('export commands', () => {
    it('calls requestExportPng on the provider', () => {
      const provider = makeProvider();
      const commands = getExportCommands(provider as never);
      const cmd = commands.find((cmd) => cmd.id === 'codegraphy.exportPng')!;

      cmd.handler();

      expect(provider.requestExportPng).toHaveBeenCalledOnce();
    });

    it('calls requestExportSvg on the provider', () => {
      const provider = makeProvider();
      const commands = getExportCommands(provider as never);
      const cmd = commands.find((cmd) => cmd.id === 'codegraphy.exportSvg')!;

      cmd.handler();

      expect(provider.requestExportSvg).toHaveBeenCalledOnce();
    });

    it('calls requestExportJpeg on the provider', () => {
      const provider = makeProvider();
      const commands = getExportCommands(provider as never);
      const cmd = commands.find((cmd) => cmd.id === 'codegraphy.exportJpeg')!;

      cmd.handler();

      expect(provider.requestExportJpeg).toHaveBeenCalledOnce();
    });

    it('calls requestExportJson on the provider', () => {
      const provider = makeProvider();
      const commands = getExportCommands(provider as never);
      const cmd = commands.find((cmd) => cmd.id === 'codegraphy.exportJson')!;

      cmd.handler();

      expect(provider.requestExportJson).toHaveBeenCalledOnce();
    });

    it('calls requestExportMarkdown on the provider', () => {
      const provider = makeProvider();
      const commands = getExportCommands(provider as never);
      const cmd = commands.find((cmd) => cmd.id === 'codegraphy.exportMarkdown')!;

      cmd.handler();

      expect(provider.requestExportMarkdown).toHaveBeenCalledOnce();
    });
  });

  describe('clearCache command', () => {
    it('calls clearCacheAndRefresh on the provider', () => {
      const provider = makeProvider();
      const commands = getExportCommands(provider as never);
      const cmd = commands.find((cmd) => cmd.id === 'codegraphy.clearCache')!;

      cmd.handler();

      expect(provider.clearCacheAndRefresh).toHaveBeenCalledOnce();
    });
  });
});
