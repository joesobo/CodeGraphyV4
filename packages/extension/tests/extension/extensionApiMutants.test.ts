/**
 * @fileoverview Tests targeting surviving mutants in extension/index.ts.
 *
 * Surviving mutants (L37-L40):
 * - L37:19 ArrowFunction: () => undefined (getGraphData callback)
 * - L38:20 ArrowFunction: () => undefined (sendToWebview callback)
 * - L39:23 ArrowFunction: () => undefined (onWebviewMessage callback)
 * - L40:21 ArrowFunction: () => undefined (registerPlugin callback)
 *
 * Each of these mutations replaces the arrow function body with `() => undefined`,
 * meaning the API methods would silently return undefined instead of delegating
 * to the provider.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { activate } from '../../src/extension/index';
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

describe('activate() API return values delegate to provider', () => {
  let mockContext: ReturnType<typeof makeMockContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = makeMockContext();
  });

  it('getGraphData returns the actual graph data from the provider', () => {
    const api = activate(mockContext as unknown as vscode.ExtensionContext);

    // Get the provider instance that was registered
    const provider = (
      vscode.window.registerWebviewViewProvider as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls[0]?.[1] as GraphViewProvider;

    // Mock the provider's getGraphData to return specific data
    const mockGraphData = { nodes: [{ id: 'test' }], edges: [] };
    vi.spyOn(provider, 'getGraphData').mockReturnValue(mockGraphData as never);

    const result = api.getGraphData();

    // If the arrow function is mutated to () => undefined, result would be undefined
    expect(result).toBe(mockGraphData);
    expect(result).not.toBeUndefined();
  });

  it('sendToWebview delegates the message to the provider', () => {
    const api = activate(mockContext as unknown as vscode.ExtensionContext);

    const provider = (
      vscode.window.registerWebviewViewProvider as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls[0]?.[1] as GraphViewProvider;

    const sendSpy = vi.spyOn(provider, 'sendToWebview').mockImplementation(() => {});
    const testMessage = { type: 'TEST', payload: 42 };

    api.sendToWebview(testMessage);

    // If mutated to () => undefined, sendToWebview would NOT be called on the provider
    expect(sendSpy).toHaveBeenCalledWith(testMessage);
  });

  it('onWebviewMessage delegates to the provider and returns a disposable', () => {
    const api = activate(mockContext as unknown as vscode.ExtensionContext);

    const provider = (
      vscode.window.registerWebviewViewProvider as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls[0]?.[1] as GraphViewProvider;

    const mockDisposable = { dispose: vi.fn() };
    const onMessageSpy = vi.spyOn(provider, 'onWebviewMessage').mockReturnValue(mockDisposable);
    const handler = vi.fn();

    const disposable = api.onWebviewMessage(handler);

    // If mutated to () => undefined, onWebviewMessage would NOT be called
    // and the return value would be undefined instead of a disposable
    expect(onMessageSpy).toHaveBeenCalledWith(handler);
    expect(disposable).toBe(mockDisposable);
    expect(disposable).not.toBeUndefined();
  });

  it('registerPlugin delegates to the provider with plugin and options', () => {
    const api = activate(mockContext as unknown as vscode.ExtensionContext);

    const provider = (
      vscode.window.registerWebviewViewProvider as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls[0]?.[1] as GraphViewProvider;

    const registerSpy = vi.spyOn(provider, 'registerExternalPlugin').mockImplementation(() => {});
    const mockPlugin = { id: 'test-plugin' };
    const mockOptions = { extensionUri: '/ext' };

    api.registerPlugin(mockPlugin, mockOptions);

    // If mutated to () => undefined, registerExternalPlugin would NOT be called
    expect(registerSpy).toHaveBeenCalledWith(mockPlugin, mockOptions);
  });
});
