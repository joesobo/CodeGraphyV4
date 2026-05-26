import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeConfigAction } from '../../../src/extension/config/actions';

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

function makeEvent(...matchingKeys: string[]) {
  const keySet = new Set(matchingKeys);
  return {
    affectsConfiguration: (key: string) => keySet.has(key),
  };
}

describe('executeConfigAction', () => {

    beforeEach(() => {
      vi.clearAllMocks();
    });



    it('calls refreshPhysicsSettings for physics category', () => {
      const provider = makeProvider();
      const event = makeEvent();

      executeConfigAction('physics', event as never, provider as never);

      expect(provider.refreshPhysicsSettings).toHaveBeenCalledOnce();
      expect(provider.refresh).not.toHaveBeenCalled();
    });



    it('calls refreshToggleSettings for toggles category', () => {
      const provider = makeProvider();
      const event = makeEvent();

      executeConfigAction('toggles', event as never, provider as never);

      expect(provider.refreshToggleSettings).toHaveBeenCalledOnce();
      expect(provider.refresh).not.toHaveBeenCalled();
    });



    it('calls refreshSettings for display category', () => {
      const provider = makeProvider();
      const event = makeEvent();

      executeConfigAction('display', event as never, provider as never);

      expect(provider.refreshSettings).toHaveBeenCalledOnce();
      expect(provider.refresh).not.toHaveBeenCalled();
    });



    it('debounces legend settings syncs and refreshes group settings once', () => {
      vi.useFakeTimers();
      const provider = makeProvider();
      const event = makeEvent();

      executeConfigAction('legend', event as never, provider as never);
      executeConfigAction('legend', event as never, provider as never);

      expect(provider.refreshPhysicsSettings).not.toHaveBeenCalled();
      expect(provider.refreshToggleSettings).not.toHaveBeenCalled();
      expect(provider.refreshSettings).not.toHaveBeenCalled();
      expect(provider.refreshGroupSettings).not.toHaveBeenCalled();
      expect(provider.refresh).not.toHaveBeenCalled();

      vi.advanceTimersByTime(299);
      expect(provider.refreshGroupSettings).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(provider.refreshGroupSettings).toHaveBeenCalledOnce();

      vi.useRealTimers();
    });



    it('does not clear a missing legend refresh timer on the first legend sync', () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
      const provider = makeProvider();
      const event = makeEvent();

      try {
        executeConfigAction('legend', event as never, provider as never);

        expect(clearTimeoutSpy).not.toHaveBeenCalled();

        vi.runOnlyPendingTimers();
      } finally {
        clearTimeoutSpy.mockRestore();
        vi.useRealTimers();
      }
    });



    it('sends graph layout without refreshing for layout category changes', () => {
      const provider = makeProvider();
      const event = makeEvent('codegraphy.graphLayout');

      executeConfigAction('layout', event as never, provider as never);

      expect(provider.sendGraphLayout).toHaveBeenCalledOnce();
      expect(provider.refresh).not.toHaveBeenCalled();
      expect(provider.refreshGroupSettings).not.toHaveBeenCalled();
    });
});
