import * as vscode from 'vscode';
import { describe, expect, it, vi } from 'vitest';
import {
  copyGraphViewProviderTextToClipboard,
  openGraphViewProviderFile,
  revealGraphViewProviderFileInExplorer,
} from '../../../src/extension/graphView/providerFileNavigation';

describe('graph view provider file-navigation helpers', () => {
  it('opens files with the provider visit-count callback', async () => {
    const source = {
      _incrementVisitCount: vi.fn(() => Promise.resolve()),
    };
    const openFile = vi.fn(async (_filePath, handlers) => {
      await handlers.incrementVisitCount('src/index.ts');
    });

    await openGraphViewProviderFile(
      source as never,
      'src/index.ts',
      { preview: false, preserveFocus: false },
      {
        getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
        showInformationMessage: vi.fn(),
        showErrorMessage: vi.fn(),
        statFile: vi.fn(),
        openTextDocument: vi.fn(),
        showTextDocument: vi.fn(),
        openFile,
        logError: vi.fn(),
      } as never,
    );

    expect(openFile).toHaveBeenCalledOnce();
    expect(source._incrementVisitCount).toHaveBeenCalledWith('src/index.ts');
  });

  it('forwards live navigation handlers through the file opener', async () => {
    const workspaceFolder = { uri: vscode.Uri.file('/workspace') };
    const fileUri = vscode.Uri.file('/workspace/src/index.ts');
    const document = { uri: fileUri } as vscode.TextDocument;
    const source = {
      _incrementVisitCount: vi.fn(() => Promise.resolve()),
    };
    const showInformationMessage = vi.fn();
    const showErrorMessage = vi.fn();
    const statFile = vi.fn(() => Promise.resolve({}));
    const openTextDocument = vi.fn(() => Promise.resolve(document));
    const showTextDocument = vi.fn(() => Promise.resolve());
    const logError = vi.fn();

    await openGraphViewProviderFile(
      source as never,
      'src/index.ts',
      { preview: false, preserveFocus: true },
      {
        getWorkspaceFolder: vi.fn(() => workspaceFolder),
        showInformationMessage,
        showErrorMessage,
        statFile,
        openTextDocument,
        showTextDocument,
        openFile: vi.fn(async (_filePath, handlers, behavior) => {
          expect(handlers.workspaceFolder).toBe(workspaceFolder);
          expect(behavior).toEqual({ preview: false, preserveFocus: true });

          handlers.showInformationMessage('opened');
          handlers.showErrorMessage('missing');
          await handlers.statFile(fileUri);
          await handlers.openTextDocument(fileUri);
          await handlers.showTextDocument(document, { preview: true, preserveFocus: false });
          await handlers.incrementVisitCount('src/other.ts');
          handlers.logError('open failed', 'boom');
        }),
        revealFile: vi.fn(),
        writeText: vi.fn(() => Promise.resolve()),
        copyText: vi.fn(),
        logError,
      },
    );

    expect(showInformationMessage).toHaveBeenCalledWith('opened');
    expect(showErrorMessage).toHaveBeenCalledWith('missing');
    expect(statFile).toHaveBeenCalledWith(fileUri);
    expect(openTextDocument).toHaveBeenCalledWith(fileUri);
    expect(showTextDocument).toHaveBeenCalledWith(document, {
      preview: true,
      preserveFocus: false,
    });
    expect(source._incrementVisitCount).toHaveBeenCalledWith('src/other.ts');
    expect(logError).toHaveBeenCalledWith('open failed', 'boom');
  });

  it('reveals files through the configured explorer dependency', async () => {
    const revealFile = vi.fn(async (_filePath, options) => {
      await options.executeCommand('revealFileInOS', 'src/index.ts');
    });
    const executeCommand = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

    await revealGraphViewProviderFileInExplorer('src/index.ts', {
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
      revealFile,
    } as never);

    expect(revealFile).toHaveBeenCalledWith('src/index.ts', {
      workspaceFolder: { uri: { fsPath: '/workspace' } },
      executeCommand: expect.any(Function),
    });
    expect(executeCommand).toHaveBeenCalledWith('revealFileInOS', 'src/index.ts');
    executeCommand.mockRestore();
  });

  it('copies text through the configured clipboard dependency', async () => {
    const copyText = vi.fn(async (_text, options) => {
      await options.writeText('absolute:src/index.ts');
    });
    const writeText = vi.fn(() => Promise.resolve());

    await copyGraphViewProviderTextToClipboard('absolute:src/index.ts', {
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
      writeText,
      copyText,
    } as never);

    expect(copyText).toHaveBeenCalledWith('absolute:src/index.ts', {
      workspaceFolder: { uri: { fsPath: '/workspace' } },
      writeText: expect.any(Function),
    });
    expect(writeText).toHaveBeenCalledWith('absolute:src/index.ts');
  });
});
