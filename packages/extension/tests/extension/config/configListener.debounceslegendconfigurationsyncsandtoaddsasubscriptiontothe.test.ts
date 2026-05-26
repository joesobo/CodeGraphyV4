import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { registerConfigHandler } from '../../../src/extension/config/listener';

function makeProvider() {
  return {
    refreshPhysicsSettings: vi.fn(),
    refreshToggleSettings: vi.fn(),
    refreshSettings: vi.fn(),
    refreshGroupSettings: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
    emitEvent: vi.fn(),
    invalidateTimelineCache: vi.fn().mockResolvedValue(undefined),
    sendPlaybackSpeed: vi.fn(),
    sendGraphLayout: vi.fn(),
  };
}

function makeContext() {
  return {
    subscriptions: [] as { dispose: () => void }[],
  };
}

function getConfigListener() {
  const mock = vscode.workspace.onDidChangeConfiguration as unknown as {
    mock: { calls: unknown[][] };
  };
  return mock.mock.calls[0]?.[0] as (event: { affectsConfiguration: (key: string) => boolean }) => void;
}

describe('configListener', () => {

    beforeEach(() => {
      vi.clearAllMocks();
    });



    it('debounces legend configuration syncs and refreshes group settings once', () => {
      vi.useFakeTimers();
      const context = makeContext();
      const provider = makeProvider();

      registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

      const listener = getConfigListener();
      listener({ affectsConfiguration: (key) => key === 'codegraphy.legend' });
      listener({ affectsConfiguration: (key) => key === 'codegraphy.hiddenPluginGroups' });

      expect(provider.refreshGroupSettings).not.toHaveBeenCalled();

      vi.advanceTimersByTime(299);
      expect(provider.refreshGroupSettings).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(provider.refreshGroupSettings).toHaveBeenCalledOnce();

      vi.useRealTimers();
    });



    it('syncs graph layout without reloading the graph when layout changes', () => {
      const context = makeContext();
      const provider = makeProvider();

      registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

      const listener = getConfigListener();
      listener({
        affectsConfiguration: (key) =>
          key === 'codegraphy' ||
          key === 'codegraphy.graphLayout',
      });

      expect(provider.sendGraphLayout).toHaveBeenCalledOnce();
      expect(provider.refresh).not.toHaveBeenCalled();
      expect(provider.refreshGroupSettings).not.toHaveBeenCalled();
    });



    it('triggers full refresh for unrecognized codegraphy settings', () => {
      const context = makeContext();
      const provider = makeProvider();

      registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

      const listener = getConfigListener();
      listener({ affectsConfiguration: (key) => key === 'codegraphy' || key === 'codegraphy.maxFiles' });

      expect(provider.refresh).toHaveBeenCalledOnce();
      expect(provider.emitEvent).toHaveBeenCalledWith('workspace:configChanged', {
        key: 'codegraphy',
        value: undefined,
        old: undefined,
      });
    });



    it('invalidates timeline cache when filterPatterns change', () => {
      const context = makeContext();
      const provider = makeProvider();

      registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

      const listener = getConfigListener();
      listener({
        affectsConfiguration: (key) =>
          key === 'codegraphy' ||
          key === 'codegraphy.filterPatterns',
      });

      expect(provider.invalidateTimelineCache).toHaveBeenCalledOnce();
    });



    it('sends playback speed when timeline.playbackSpeed changes', () => {
      const context = makeContext();
      const provider = makeProvider();

      registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

      const listener = getConfigListener();
      listener({
        affectsConfiguration: (key) =>
          key === 'codegraphy' ||
          key === 'codegraphy.timeline.playbackSpeed',
      });

      expect(provider.sendPlaybackSpeed).toHaveBeenCalledOnce();
    });



    it('adds a subscription to the context', () => {
      const context = makeContext();
      const provider = makeProvider();

      registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

      expect(context.subscriptions.length).toBe(1);
    });
});
