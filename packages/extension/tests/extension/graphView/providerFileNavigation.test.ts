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

  it('reveals files through the configured explorer dependency', async () => {
    const revealFile = vi.fn(() => Promise.resolve());

    await revealGraphViewProviderFileInExplorer('src/index.ts', {
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
      revealFile,
    } as never);

    expect(revealFile).toHaveBeenCalledWith('src/index.ts', {
      workspaceFolder: { uri: { fsPath: '/workspace' } },
      executeCommand: expect.any(Function),
    });
  });

  it('copies text through the configured clipboard dependency', async () => {
    const copyText = vi.fn(() => Promise.resolve());

    await copyGraphViewProviderTextToClipboard('absolute:src/index.ts', {
      getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
      writeText: vi.fn(() => Promise.resolve()),
      copyText,
    } as never);

    expect(copyText).toHaveBeenCalledWith('absolute:src/index.ts', {
      workspaceFolder: { uri: { fsPath: '/workspace' } },
      writeText: expect.any(Function),
    });
  });
});
