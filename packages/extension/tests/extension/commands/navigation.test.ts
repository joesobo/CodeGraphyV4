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
    expect(ids).toContain('codegraphy.toggleDepthMode');
  });

  describe('open command', () => {
    it('opens the CodeGraphy container and focuses the graph view', async () => {
      const provider = makeProvider();
      const commands = getNavCommands(provider as never);
      const cmd = commands.find((cmd) => cmd.id === 'codegraphy.open')!;

      await cmd.handler();

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.view.extension.codegraphy'
      );
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'codegraphy.graphView.focus'
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

  describe('toggleDepthMode command', () => {
    it('sends TOGGLE_DEPTH_MODE command to the provider', () => {
      const provider = makeProvider();
      const commands = getNavCommands(provider as never);
      const cmd = commands.find((cmd) => cmd.id === 'codegraphy.toggleDepthMode')!;

      cmd.handler();

      expect(provider.sendCommand).toHaveBeenCalledWith('TOGGLE_DEPTH_MODE');
    });
  });

});
