import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as VSCode from 'vscode';
import { createContext, createRestoredState, loadSubject, unmockRuntimeModules } from './runtime/fixture';

describe('graphView/provider/runtime', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    unmockRuntimeModules();
    vi.resetModules();
  });

  it('dispatches extension messages to listeners and stops after disposal', async () => {
    vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices: vi.fn(),
      restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
    }));

    const { GraphViewProvider, vscodeModule } = await loadSubject([
      {
        uri: { fsPath: '/test/workspace', path: '/test/workspace' },
        name: 'workspace',
        index: 0,
      },
    ]);
    const context = createContext(vscodeModule) as unknown as VSCode.ExtensionContext;
    const provider = new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      context,
    );
    const handler = vi.fn();
    const dispose = provider.onExtensionMessage(handler);
    const runtime = provider as unknown as { _notifyExtensionMessage(message: unknown): void };

    runtime._notifyExtensionMessage({ type: 'FIRST' });
    expect(handler).toHaveBeenCalledWith({ type: 'FIRST' });

    dispose.dispose();
    runtime._notifyExtensionMessage({ type: 'SECOND' });
    expect(handler).toHaveBeenCalledTimes(1);

    context.subscriptions[0]?.dispose();
  }, 30000);

  it('tracks the installed plugin activation promise', async () => {
    vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices: vi.fn(),
      restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
    }));

    const { GraphViewProvider, vscodeModule } = await loadSubject([
      {
        uri: { fsPath: '/test/workspace', path: '/test/workspace' },
        name: 'workspace',
        index: 0,
      },
    ]);
    const provider = new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      createContext(vscodeModule) as unknown as VSCode.ExtensionContext,
    );
    const activationPromise = Promise.resolve();

    provider.setInstalledPluginActivationPromise(activationPromise);

    expect(
      (provider as unknown as { _installedPluginActivationPromise: Promise<void> })
        ._installedPluginActivationPromise,
    ).toBe(activationPromise);
  }, 30000);
});
