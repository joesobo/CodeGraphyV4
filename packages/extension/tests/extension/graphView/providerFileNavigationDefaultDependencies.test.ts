import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  let workspaceFolders: { uri: { fsPath: string } }[] | undefined = [
    { uri: { fsPath: '/workspace' } },
  ];

  return {
    get workspaceFolders(): { uri: { fsPath: string } }[] | undefined {
      return workspaceFolders;
    },
    set workspaceFolders(value: { uri: { fsPath: string } }[] | undefined) {
      workspaceFolders = value;
    },
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    stat: vi.fn(async () => ({ type: 1 })),
    openTextDocument: vi.fn(async () => ({ uri: { fsPath: '/workspace/src/index.ts' } })),
    showTextDocument: vi.fn(async () => ({ editor: true })),
    executeCommand: vi.fn(async () => undefined),
    writeText: vi.fn(async () => undefined),
    openGraphViewFile: vi.fn(),
    revealGraphViewFileInExplorer: vi.fn(),
    copyGraphViewTextToClipboard: vi.fn(),
  };
});

vi.mock('vscode', () => ({
  workspace: {
    get workspaceFolders() {
      return mocks.workspaceFolders;
    },
    fs: {
      stat: mocks.stat,
    },
    openTextDocument: mocks.openTextDocument,
  },
  window: {
    showInformationMessage: mocks.showInformationMessage,
    showErrorMessage: mocks.showErrorMessage,
    showTextDocument: mocks.showTextDocument,
  },
  commands: {
    executeCommand: mocks.executeCommand,
  },
  env: {
    clipboard: {
      writeText: mocks.writeText,
    },
  },
}));

vi.mock('../../../src/extension/graphView/fileNavigation', () => ({
  openGraphViewFile: mocks.openGraphViewFile,
  revealGraphViewFileInExplorer: mocks.revealGraphViewFileInExplorer,
  copyGraphViewTextToClipboard: mocks.copyGraphViewTextToClipboard,
}));

import {
  copyGraphViewProviderTextToClipboard,
  openGraphViewProviderFile,
  revealGraphViewProviderFileInExplorer,
} from '../../../src/extension/graphView/providerFileNavigation';

describe('graphView/providerFileNavigation default dependencies', () => {
  beforeEach(() => {
    mocks.workspaceFolders = [{ uri: { fsPath: '/workspace' } }];
    mocks.showInformationMessage.mockReset();
    mocks.showErrorMessage.mockReset();
    mocks.stat.mockReset();
    mocks.openTextDocument.mockReset();
    mocks.showTextDocument.mockReset();
    mocks.executeCommand.mockReset();
    mocks.writeText.mockReset();
    mocks.openGraphViewFile.mockReset();
    mocks.revealGraphViewFileInExplorer.mockReset();
    mocks.copyGraphViewTextToClipboard.mockReset();
  });

  it('uses the default file-opening delegates with the current workspace folder', async () => {
    const source = {
      _incrementVisitCount: vi.fn(async () => undefined),
    };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    mocks.openGraphViewFile.mockImplementation(async (_filePath, handlers, behavior) => {
      expect(handlers.workspaceFolder).toEqual({ uri: { fsPath: '/workspace' } });
      handlers.showInformationMessage('opened');
      handlers.showErrorMessage('missing');
      await handlers.statFile({ fsPath: '/workspace/src/index.ts' });
      const document = await handlers.openTextDocument({ fsPath: '/workspace/src/index.ts' });
      await handlers.showTextDocument(document, behavior);
      await handlers.incrementVisitCount('src/index.ts');
      handlers.logError('open failed', 'raw failure');
    });

    await openGraphViewProviderFile(
      source as never,
      'src/index.ts',
      { preview: false, preserveFocus: false },
    );

    expect(mocks.showInformationMessage).toHaveBeenCalledWith('opened');
    expect(mocks.showErrorMessage).toHaveBeenCalledWith('missing');
    expect(mocks.stat).toHaveBeenCalledWith({ fsPath: '/workspace/src/index.ts' });
    expect(mocks.openTextDocument).toHaveBeenCalledWith({ fsPath: '/workspace/src/index.ts' });
    expect(mocks.showTextDocument).toHaveBeenCalledWith(
      { uri: { fsPath: '/workspace/src/index.ts' } },
      { preview: false, preserveFocus: false },
    );
    expect(source._incrementVisitCount).toHaveBeenCalledWith('src/index.ts');
    expect(consoleError).toHaveBeenCalledWith('open failed', 'raw failure');

    consoleError.mockRestore();
  });

  it('uses the default explorer and clipboard delegates with the current workspace folder', async () => {
    mocks.revealGraphViewFileInExplorer.mockImplementation(async (_filePath, handlers) => {
      expect(handlers.workspaceFolder).toEqual({ uri: { fsPath: '/workspace' } });
      await handlers.executeCommand('revealFileInOS', '/workspace/src/index.ts');
    });
    mocks.copyGraphViewTextToClipboard.mockImplementation(async (_text, handlers) => {
      expect(handlers.workspaceFolder).toEqual({ uri: { fsPath: '/workspace' } });
      await handlers.writeText('absolute:src/index.ts');
    });

    await revealGraphViewProviderFileInExplorer('src/index.ts');
    await copyGraphViewProviderTextToClipboard('absolute:src/index.ts');

    expect(mocks.executeCommand).toHaveBeenCalledWith('revealFileInOS', '/workspace/src/index.ts');
    expect(mocks.writeText).toHaveBeenCalledWith('absolute:src/index.ts');
  });

  it('passes an undefined workspace folder through the default explorer and clipboard delegates', async () => {
    mocks.workspaceFolders = undefined;
    mocks.revealGraphViewFileInExplorer.mockImplementation(async (_filePath, handlers) => {
      expect(handlers.workspaceFolder).toBeUndefined();
    });
    mocks.copyGraphViewTextToClipboard.mockImplementation(async (_text, handlers) => {
      expect(handlers.workspaceFolder).toBeUndefined();
    });

    await revealGraphViewProviderFileInExplorer('src/index.ts');
    await copyGraphViewProviderTextToClipboard('absolute:src/index.ts');

    expect(mocks.revealGraphViewFileInExplorer).toHaveBeenCalledOnce();
    expect(mocks.copyGraphViewTextToClipboard).toHaveBeenCalledOnce();
  });
});
