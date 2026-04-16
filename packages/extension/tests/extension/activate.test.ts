import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate } from '../../src/extension/activate';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';

function makeMockContext() {
  return {
    subscriptions: [] as { dispose: () => void }[],
    extensionUri: vscode.Uri.file('/test/extension'),
    workspaceState: {
      get: () => undefined,
      update: () => Promise.resolve(),
    },
  };
}

function getRegisteredProvider(): GraphViewProvider {
  return (
    vscode.window.registerWebviewViewProvider as unknown as { mock: { calls: unknown[][] } }
  ).mock.calls[0]?.[1] as GraphViewProvider;
}

describe('activate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches webview messages through the provider', async () => {
    const api = activate(makeMockContext() as unknown as vscode.ExtensionContext);
    const provider = getRegisteredProvider();
    const dispatchSpy = vi
      .spyOn(provider, 'dispatchWebviewMessage')
      .mockResolvedValue(undefined);
    const message = { type: 'WEBVIEW_READY' } as const;

    await expect(api.dispatchWebviewMessage(message as never)).resolves.toBeUndefined();
    expect(dispatchSpy).toHaveBeenCalledWith(message);
  });

  it('registers extension message listeners through the provider', () => {
    const api = activate(makeMockContext() as unknown as vscode.ExtensionContext);
    const provider = getRegisteredProvider();
    const disposable = { dispose: vi.fn() };
    const handler = vi.fn();

    const onExtensionMessageSpy = vi
      .spyOn(provider, 'onExtensionMessage')
      .mockReturnValue(disposable);

    expect(api.onExtensionMessage(handler)).toBe(disposable);
    expect(onExtensionMessageSpy).toHaveBeenCalledWith(handler);
  });
});
