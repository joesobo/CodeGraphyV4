import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IGroup } from '@/shared/settings/groups';
import { setGraphViewProviderMessageListener } from '../../../../../src/extension/graphView/webview/providerMessages/listener';
import { createDependencies, createSource, resetListenerMocks } from './listener.fixture';

afterEach(resetListenerMocks);

describe('graph view provider listener registration and messages', () => {
  it('does not analyze twice when the same webview listener is registered twice and refresh is clicked once', async () => {
    const activeHandlers = new Set<(message: unknown) => Promise<void>>();
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        activeHandlers.add(handler);
        return {
          dispose: () => {
            activeHandlers.delete(handler);
          },
        };
      }),
    };
    const deps = createDependencies();
    const source = createSource();

    setGraphViewProviderMessageListener(webview as never, source, deps);
    setGraphViewProviderMessageListener(webview as never, source, deps);

    expect(activeHandlers.size).toBe(1);

    await Promise.all([...activeHandlers].map(handler => handler({ type: 'REFRESH_GRAPH' })));

    expect(source.refreshIndex).toHaveBeenCalledTimes(1);
    expect(source.clearCacheAndRefresh).not.toHaveBeenCalled();
  });

  it('stores updated user groups back onto the provider source', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const deps = createDependencies();
    const source = createSource();
    const userGroups: IGroup[] = [{ id: 'user:src', pattern: 'src/**', color: '#112233' }];

    setGraphViewProviderMessageListener(webview as never, source, deps);
    await messageHandler?.({ type: 'UPDATE_LEGENDS', payload: { legends: userGroups } });

    expect(source._userGroups).toEqual(userGroups);
  });

  it('routes OPEN_IN_EDITOR through the provider webview methods', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const deps = createDependencies();
    const source = createSource();

    setGraphViewProviderMessageListener(webview as never, source, deps);
    await messageHandler?.({ type: 'OPEN_IN_EDITOR' });

    expect(source._webviewMethods.openInEditor).toHaveBeenCalledOnce();
  });


  it('stores ready state updates back onto the provider source', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const deps = createDependencies();
    const source = createSource();

    setGraphViewProviderMessageListener(webview as never, source, deps);
    await messageHandler?.({ type: 'WEBVIEW_READY', payload: null });

    expect(source._webviewReadyNotified).toBe(true);
    expect(source._sendFavorites).toHaveBeenCalledOnce();
    expect(source._sendSettings).toHaveBeenCalledOnce();
    expect(source._sendPhysicsSettings).toHaveBeenCalledOnce();
    expect(source._sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(source._sendDecorations).toHaveBeenCalledOnce();
    expect(source._sendContextMenuItems).toHaveBeenCalledOnce();
    expect(source._sendPluginStatuses).toHaveBeenCalledOnce();
    expect(source._sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(source._analyzer?.registry?.notifyWebviewReady).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: {
        patterns: ['dist/**'],
        pluginPatterns: ['plugin/**'],
        pluginPatternGroups: [],
        disabledCustomPatterns: [],
        disabledPluginPatterns: [],
      },
    });
  });


});
