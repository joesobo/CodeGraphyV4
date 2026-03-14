import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  decodeBase64DataUrl,
  saveExportBuffer,
  toErrorMessage,
} from '../../../src/extension/export/common';

describe('export common', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.window as Record<string, unknown>).showSaveDialog = vi.fn();
    (vscode.window as Record<string, unknown>).showInformationMessage = vi.fn();
    (vscode.workspace.fs as Record<string, unknown>).writeFile = vi.fn();
    (vscode.commands as Record<string, unknown>).executeCommand = vi.fn();

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      get: () => [{ uri: vscode.Uri.file('/workspace'), name: 'workspace', index: 0 }],
      configurable: true,
    });
  });

  it('returns the message from Error instances', () => {
    expect(toErrorMessage(new Error('disk full'))).toBe('disk full');
  });

  it('stringifies non-Error values', () => {
    expect(toErrorMessage({ reason: 'bad data' })).toBe('[object Object]');
  });

  it('decodes base64 export data after validating the prefix', () => {
    const encoded = Buffer.from('hello world').toString('base64');

    expect(decodeBase64DataUrl(`data:text/plain;base64,${encoded}`, 'data:text/plain;base64,')).toEqual(
      Buffer.from('hello world')
    );
  });

  it('throws when the export data url prefix is unexpected', () => {
    expect(() =>
      decodeBase64DataUrl('data:image/png;base64,AAAA', 'data:image/jpeg;base64,')
    ).toThrow('Unexpected export data format. Expected prefix: data:image/jpeg;base64,');
  });

  it('uses the first workspace folder to seed the save dialog and opens the saved file when requested', async () => {
    const saveUri = vscode.Uri.file('/workspace/graph.json');
    vi.mocked(vscode.window.showSaveDialog).mockResolvedValue(saveUri);
    vi.mocked(vscode.window.showInformationMessage).mockResolvedValue('Open File');

    await saveExportBuffer(Buffer.from('graph-data'), {
      defaultFilename: 'graph.json',
      filters: { JSON: ['json'] },
      title: 'Export Graph',
      successMessage: 'Graph exported',
    });

    expect(vscode.window.showSaveDialog).toHaveBeenCalledWith({
      defaultUri: { fsPath: '/workspace/graph.json', path: '/workspace/graph.json' },
      filters: { JSON: ['json'] },
      saveLabel: 'Export',
      title: 'Export Graph',
    });
    expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(saveUri, Buffer.from('graph-data'));
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      'Graph exported to /workspace/graph.json',
      'Open File',
      'Open Folder'
    );
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('vscode.open', saveUri);
  });

  it('falls back to a plain file uri when no workspace folder exists', async () => {
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      get: () => undefined,
      configurable: true,
    });
    vi.mocked(vscode.window.showSaveDialog).mockResolvedValue(undefined);

    await saveExportBuffer(Buffer.from('graph-data'), {
      defaultFilename: 'graph.json',
      filters: { JSON: ['json'] },
      title: 'Export Graph',
      successMessage: 'Graph exported',
    });

    expect(vscode.window.showSaveDialog).toHaveBeenCalledWith({
      defaultUri: { fsPath: 'graph.json', path: 'graph.json' },
      filters: { JSON: ['json'] },
      saveLabel: 'Export',
      title: 'Export Graph',
    });
  });

  it('falls back to a plain file uri when the workspace folder list is empty', async () => {
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      get: () => [],
      configurable: true,
    });
    vi.mocked(vscode.window.showSaveDialog).mockResolvedValue(undefined);

    await saveExportBuffer(Buffer.from('graph-data'), {
      defaultFilename: 'graph.json',
      filters: { JSON: ['json'] },
      title: 'Export Graph',
      successMessage: 'Graph exported',
    });

    expect(vscode.window.showSaveDialog).toHaveBeenCalledWith({
      defaultUri: { fsPath: 'graph.json', path: 'graph.json' },
      filters: { JSON: ['json'] },
      saveLabel: 'Export',
      title: 'Export Graph',
    });
  });

  it('does nothing after the save dialog is cancelled', async () => {
    vi.mocked(vscode.window.showSaveDialog).mockResolvedValue(undefined);

    await saveExportBuffer(Buffer.from('graph-data'), {
      defaultFilename: 'graph.json',
      filters: { JSON: ['json'] },
      title: 'Export Graph',
      successMessage: 'Graph exported',
    });

    expect(vscode.workspace.fs.writeFile).not.toHaveBeenCalled();
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('reveals the saved file in the OS when the folder action is selected', async () => {
    const saveUri = vscode.Uri.file('/workspace/graph.json');
    vi.mocked(vscode.window.showSaveDialog).mockResolvedValue(saveUri);
    vi.mocked(vscode.window.showInformationMessage).mockResolvedValue('Open Folder');

    await saveExportBuffer(Buffer.from('graph-data'), {
      defaultFilename: 'graph.json',
      filters: { JSON: ['json'] },
      title: 'Export Graph',
      successMessage: 'Graph exported',
    });

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('revealFileInOS', saveUri);
  });

  it('does not run a command when the success action is unrecognized', async () => {
    const saveUri = vscode.Uri.file('/workspace/graph.json');
    vi.mocked(vscode.window.showSaveDialog).mockResolvedValue(saveUri);
    vi.mocked(vscode.window.showInformationMessage).mockResolvedValue('Ignore');

    await saveExportBuffer(Buffer.from('graph-data'), {
      defaultFilename: 'graph.json',
      filters: { JSON: ['json'] },
      title: 'Export Graph',
      successMessage: 'Graph exported',
    });

    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });
});
