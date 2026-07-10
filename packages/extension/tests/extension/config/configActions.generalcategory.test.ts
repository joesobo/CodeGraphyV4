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

  describe('general category', () => {

        it('syncs the full settings snapshot before refreshing for general category changes', () => {
          const provider = makeProvider();
          const event = makeEvent('codegraphy.maxFiles');

          executeConfigAction('general', event as never, provider as never);

          expect(provider.refreshGroupSettings).toHaveBeenCalledOnce();
          expect(provider.refresh).toHaveBeenCalledOnce();
          expect(provider.refreshGroupSettings.mock.invocationCallOrder[0]).toBeLessThan(
            provider.refresh.mock.invocationCallOrder[0],
          );
        });



        it('calls refresh and emitEvent for general category', () => {
          const provider = makeProvider();
          const event = makeEvent();
          const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

          try {
            executeConfigAction('general', event as never, provider as never);

            expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] Configuration changed, refreshing graph');
            expect(provider.refresh).toHaveBeenCalledOnce();
            expect(provider.emitEvent).toHaveBeenCalledWith('workspace:configChanged', {
              key: 'codegraphy',
              value: undefined,
              old: undefined,
            });
          } finally {
            logSpy.mockRestore();
          }
        });
  });
});
