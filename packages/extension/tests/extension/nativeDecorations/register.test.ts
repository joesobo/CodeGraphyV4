import * as vscode from 'vscode';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerGitChangeEvents,
  registerNativeDecorations,
} from '../../../src/extension/nativeDecorations/register';

describe('nativeDecorations/register', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('registers a disposable controller and publishes collected host state', async () => {
    vi.useFakeTimers();
    const subscriptions: Array<{ dispose(): void }> = [];
    const sendMessage = vi.fn();

    const controller = registerNativeDecorations(
      { subscriptions } as never,
      sendMessage,
      {
        getWorkspaceRoots: () => ['/workspace', '/second-root'],
        getGitExtension: () => undefined,
        execGitStatus: vi.fn(async () => ' M app.ts\0'),
        getDiagnostics: () => [
          [{ fsPath: '/workspace/app.ts' }, [{ severity: 1 }]],
          [{ fsPath: '/second-root/other.ts' }, [{ severity: 0 }]],
        ],
        onDidChangeDiagnostics: () => ({ dispose: vi.fn() }),
        onDidChangeGit: () => ({ dispose: vi.fn() }),
      },
    );

    await vi.runAllTimersAsync();

    expect(subscriptions).toContain(controller);
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'NATIVE_DECORATIONS_UPDATED',
      payload: {
        nodeDecorations: {
          'app.ts': expect.objectContaining({
            border: expect.any(Object),
            badge: expect.any(Object),
          }),
        },
      },
    });
  });

  it('uses Git repository events without a workspace-wide file watcher', async () => {
    const onDidChange = vi.fn(() => ({ dispose: vi.fn() }));
    vi.mocked(vscode.extensions.getExtension).mockReturnValue({
      isActive: true,
      exports: { getAPI: () => ({ repositories: [{ state: { onDidChange } }] }) },
    } as never);

    registerGitChangeEvents(vi.fn());
    await Promise.resolve();

    expect(onDidChange).toHaveBeenCalledOnce();
    expect(vscode.workspace.createFileSystemWatcher).not.toHaveBeenCalled();
  });

  it('uses a workspace watcher when the Git extension is unavailable', () => {
    vi.mocked(vscode.extensions.getExtension).mockReturnValue(undefined);

    registerGitChangeEvents(vi.fn());

    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/*');
  });
});
