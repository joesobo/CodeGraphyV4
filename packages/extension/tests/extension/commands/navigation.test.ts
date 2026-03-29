import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { getNavCommands } from '../../../src/extension/commands/navigation';

function makeProvider() {
  return {
    openInEditor: vi.fn(),
    sendCommand: vi.fn(),
  };
}

describe('getNavCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all expected navigation command definitions', () => {
    const provider = makeProvider();
    const commands = getNavCommands(provider as never);

    const ids = commands.map((cmd) => cmd.id);
    expect(ids).toContain('codegraphy.open');
    expect(ids).toContain('codegraphy.openInEditor');
    expect(ids).toContain('codegraphy.fitView');
    expect(ids).toContain('codegraphy.zoomIn');
    expect(ids).toContain('codegraphy.zoomOut');
    expect(ids).toContain('codegraphy.cycleView');
    expect(ids).toContain('codegraphy.cycleLayout');
    expect(ids).toContain('codegraphy.toggleDimension');
  });

  describe('open command', () => {
    it('executes the workbench view command', () => {
      const provider = makeProvider();
      const commands = getNavCommands(provider as never);
      const cmd = commands.find((cmd) => cmd.id === 'codegraphy.open')!;

      cmd.handler();

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.view.extension.codegraphy'
      );
    });
  });

  describe('openInEditor command', () => {
    it('calls openInEditor on the provider', () => {
      const provider = makeProvider();
      const commands = getNavCommands(provider as never);
      const cmd = commands.find((cmd) => cmd.id === 'codegraphy.openInEditor')!;

      cmd.handler();

      expect(provider.openInEditor).toHaveBeenCalledOnce();
    });
  });

  describe('fitView command', () => {
    it('sends FIT_VIEW command to the provider', () => {
      const provider = makeProvider();
      const commands = getNavCommands(provider as never);
      const cmd = commands.find((cmd) => cmd.id === 'codegraphy.fitView')!;

      cmd.handler();

      expect(provider.sendCommand).toHaveBeenCalledWith('FIT_VIEW');
    });
  });

  describe('zoomIn command', () => {
    it('sends ZOOM_IN command to the provider', () => {
      const provider = makeProvider();
      const commands = getNavCommands(provider as never);
      const cmd = commands.find((cmd) => cmd.id === 'codegraphy.zoomIn')!;

      cmd.handler();

      expect(provider.sendCommand).toHaveBeenCalledWith('ZOOM_IN');
    });
  });

  describe('zoomOut command', () => {
    it('sends ZOOM_OUT command to the provider', () => {
      const provider = makeProvider();
      const commands = getNavCommands(provider as never);
      const cmd = commands.find((cmd) => cmd.id === 'codegraphy.zoomOut')!;

      cmd.handler();

      expect(provider.sendCommand).toHaveBeenCalledWith('ZOOM_OUT');
    });
  });

  describe('cycleView command', () => {
    it('sends CYCLE_VIEW command to the provider', () => {
      const provider = makeProvider();
      const commands = getNavCommands(provider as never);
      const cmd = commands.find((cmd) => cmd.id === 'codegraphy.cycleView')!;

      cmd.handler();

      expect(provider.sendCommand).toHaveBeenCalledWith('CYCLE_VIEW');
    });
  });

  describe('cycleLayout command', () => {
    it('sends CYCLE_LAYOUT command to the provider', () => {
      const provider = makeProvider();
      const commands = getNavCommands(provider as never);
      const cmd = commands.find((cmd) => cmd.id === 'codegraphy.cycleLayout')!;

      cmd.handler();

      expect(provider.sendCommand).toHaveBeenCalledWith('CYCLE_LAYOUT');
    });
  });

  describe('toggleDimension command', () => {
    it('sends TOGGLE_DIMENSION command to the provider', () => {
      const provider = makeProvider();
      const commands = getNavCommands(provider as never);
      const cmd = commands.find((cmd) => cmd.id === 'codegraphy.toggleDimension')!;

      cmd.handler();

      expect(provider.sendCommand).toHaveBeenCalledWith('TOGGLE_DIMENSION');
    });
  });
});
