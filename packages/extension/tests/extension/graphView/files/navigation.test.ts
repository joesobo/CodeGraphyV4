import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  copyGraphViewTextToClipboard,
  openGraphViewFile,
  revealGraphViewFileInExplorer,
} from '../../../../src/extension/graphView/files/navigation';

describe('graphView/files/navigation', () => {
  it('shows a mock-file message when no workspace folder exists', async () => {
    const showInformationMessage = vi.fn();

    await openGraphViewFile('src/app.ts', {
      showInformationMessage,
      showErrorMessage: vi.fn(),
      statFile: vi.fn(),
      openTextDocument: vi.fn(),
      showTextDocument: vi.fn(),
      incrementVisitCount: vi.fn(),
      logError: vi.fn(),
    });

    expect(showInformationMessage).toHaveBeenCalledWith('Mock file: src/app.ts');
  });

  it('opens an existing file and tracks the visit count', async () => {
    const document = { uri: vscode.Uri.file('/workspace/src/app.ts') } as vscode.TextDocument;
    const openTextDocument = vi.fn(async () => document);
    const showTextDocument = vi.fn(async () => undefined);
    const incrementVisitCount = vi.fn(async () => undefined);

    await openGraphViewFile(
      'src/app.ts',
      {
        workspaceFolder: { uri: vscode.Uri.file('/workspace') },
        showInformationMessage: vi.fn(),
        showErrorMessage: vi.fn(),
        statFile: vi.fn(async () => ({ type: 1 })),
        openTextDocument,
        showTextDocument,
        incrementVisitCount,
        logError: vi.fn(),
      },
      { preview: false, preserveFocus: false },
    );

    expect(openTextDocument).toHaveBeenCalledWith(vscode.Uri.file('/workspace/src/app.ts'));
    expect(showTextDocument).toHaveBeenCalledWith(
      { uri: vscode.Uri.file('/workspace/src/app.ts') },
      { preview: false, preserveFocus: false },
    );
    expect(incrementVisitCount).toHaveBeenCalledWith('src/app.ts');
  });

  it('uses the default editor behavior when none is provided', async () => {
    const showTextDocument = vi.fn(async () => undefined);

    await openGraphViewFile('src/app.ts', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInformationMessage: vi.fn(),
      showErrorMessage: vi.fn(),
      statFile: vi.fn(async () => ({ type: 1 })),
      openTextDocument: vi.fn(async () => ({ uri: vscode.Uri.file('/workspace/src/app.ts') } as vscode.TextDocument)),
      showTextDocument,
      incrementVisitCount: vi.fn(async () => undefined),
      logError: vi.fn(),
    });

    expect(showTextDocument).toHaveBeenCalledWith(
      { uri: vscode.Uri.file('/workspace/src/app.ts') },
      { preview: false, preserveFocus: false },
    );
  });

  it('falls back to a mock-file message when the file is missing from disk', async () => {
    const showInformationMessage = vi.fn();
    const openTextDocument = vi.fn();

    await openGraphViewFile('src/app.ts', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInformationMessage,
      showErrorMessage: vi.fn(),
      statFile: vi.fn(async () => {
        throw new Error('missing');
      }),
      openTextDocument,
      showTextDocument: vi.fn(),
      incrementVisitCount: vi.fn(),
      logError: vi.fn(),
    });

    expect(showInformationMessage).toHaveBeenCalledWith('Mock file: src/app.ts');
    expect(openTextDocument).not.toHaveBeenCalled();
  });

  it('shows an error when opening the file fails', async () => {
    const showErrorMessage = vi.fn();
    const logError = vi.fn();

    await openGraphViewFile('src/app.ts', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      showInformationMessage: vi.fn(),
      showErrorMessage,
      statFile: vi.fn(async () => ({ type: 1 })),
      openTextDocument: vi.fn(async () => {
        throw new Error('boom');
      }),
      showTextDocument: vi.fn(),
      incrementVisitCount: vi.fn(),
      logError,
    });

    expect(logError).toHaveBeenCalledWith('[CodeGraphy] Failed to open file:', expect.any(Error));
    expect(showErrorMessage).toHaveBeenCalledWith('Could not open file: src/app.ts');
  });

  it('reveals the file in the explorer when a workspace exists', async () => {
    const executeCommand = vi.fn(async () => undefined);

    await revealGraphViewFileInExplorer('src/app.ts', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      executeCommand,
    });

    expect(executeCommand).toHaveBeenCalledWith(
      'revealInExplorer',
      vscode.Uri.file('/workspace/src/app.ts'),
    );
  });

  it('does not reveal the file in the explorer when no workspace exists', async () => {
    const executeCommand = vi.fn(async () => undefined);

    await revealGraphViewFileInExplorer('src/app.ts', {
      executeCommand,
    });

    expect(executeCommand).not.toHaveBeenCalled();
  });

  it('copies the absolute path when requested', async () => {
    const writeText = vi.fn(async () => undefined);

    await copyGraphViewTextToClipboard('absolute:src/app.ts', {
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      writeText,
    });

    expect(writeText).toHaveBeenCalledWith('/workspace/src/app.ts');
  });

  it('copies the provided text when no absolute-path prefix is used', async () => {
    const writeText = vi.fn(async () => undefined);

    await copyGraphViewTextToClipboard('src/app.ts', { writeText });

    expect(writeText).toHaveBeenCalledWith('src/app.ts');
  });

  it('keeps the original absolute-path marker when no workspace exists', async () => {
    const writeText = vi.fn(async () => undefined);

    await copyGraphViewTextToClipboard('absolute:src/app.ts', { writeText });

    expect(writeText).toHaveBeenCalledWith('absolute:src/app.ts');
  });
});
