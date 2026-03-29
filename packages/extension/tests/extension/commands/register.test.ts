import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { registerCommands } from '../../../src/extension/commands/register';

function makeProvider() {
  return {
    openInEditor: vi.fn(),
    sendCommand: vi.fn(),
    undo: vi.fn().mockResolvedValue(undefined),
    redo: vi.fn().mockResolvedValue(undefined),
    requestExportPng: vi.fn(),
    requestExportSvg: vi.fn(),
    requestExportJpeg: vi.fn(),
    requestExportJson: vi.fn(),
    requestExportMarkdown: vi.fn(),
    clearCacheAndRefresh: vi.fn().mockResolvedValue(undefined),
  };
}

function makeContext() {
  return {
    subscriptions: [] as { dispose: () => void }[],
  };
}

describe('commandRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers all 16 codegraphy commands', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerCommands(context as unknown as vscode.ExtensionContext, provider as never);

    expect(context.subscriptions.length).toBe(16);
  });

  it('registers the codegraphy.open command', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerCommands(context as unknown as vscode.ExtensionContext, provider as never);

    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'codegraphy.open',
      expect.any(Function)
    );
  });

  it('registers the codegraphy.exportMarkdown command', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerCommands(context as unknown as vscode.ExtensionContext, provider as never);

    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      'codegraphy.exportMarkdown',
      expect.any(Function)
    );
  });

  it('shows undo description in information message when undo returns a description', async () => {
    const context = makeContext();
    const provider = makeProvider();
    provider.undo.mockResolvedValue('Move node');

    registerCommands(context as unknown as vscode.ExtensionContext, provider as never);

    const undoCall = (vscode.commands.registerCommand as unknown as { mock: { calls: unknown[][] } })
      .mock.calls.find(call => call[0] === 'codegraphy.undo');
    const undoHandler = undoCall?.[1] as () => Promise<void>;
    await undoHandler();

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Undo: Move node');
  });

  it('shows nothing-to-undo message when undo returns undefined', async () => {
    const context = makeContext();
    const provider = makeProvider();
    provider.undo.mockResolvedValue(undefined);

    registerCommands(context as unknown as vscode.ExtensionContext, provider as never);

    const undoCall = (vscode.commands.registerCommand as unknown as { mock: { calls: unknown[][] } })
      .mock.calls.find(call => call[0] === 'codegraphy.undo');
    const undoHandler = undoCall?.[1] as () => Promise<void>;
    await undoHandler();

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Nothing to undo');
  });

  it('registers fitView, zoomIn, zoomOut commands that call sendCommand', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerCommands(context as unknown as vscode.ExtensionContext, provider as never);

    const calls = (vscode.commands.registerCommand as unknown as { mock: { calls: unknown[][] } }).mock.calls;

    const fitViewHandler = calls.find(call => call[0] === 'codegraphy.fitView')?.[1] as () => void;
    const zoomInHandler = calls.find(call => call[0] === 'codegraphy.zoomIn')?.[1] as () => void;
    const zoomOutHandler = calls.find(call => call[0] === 'codegraphy.zoomOut')?.[1] as () => void;

    fitViewHandler();
    zoomInHandler();
    zoomOutHandler();

    expect(provider.sendCommand).toHaveBeenCalledWith('FIT_VIEW');
    expect(provider.sendCommand).toHaveBeenCalledWith('ZOOM_IN');
    expect(provider.sendCommand).toHaveBeenCalledWith('ZOOM_OUT');
  });
});
