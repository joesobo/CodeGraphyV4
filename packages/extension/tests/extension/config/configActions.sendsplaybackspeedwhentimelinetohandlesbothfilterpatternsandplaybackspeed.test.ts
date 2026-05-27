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

  describe('general category', () => {


        it('sends playback speed when timeline.playbackSpeed changes', () => {
          const provider = makeProvider();
          const event = makeEvent('codegraphy.timeline.playbackSpeed');

          executeConfigAction('general', event as never, provider as never);

          expect(provider.sendPlaybackSpeed).toHaveBeenCalledOnce();
        });



        it('does not send playback speed when unrelated config changes', () => {
          const provider = makeProvider();
          const event = makeEvent();

          executeConfigAction('general', event as never, provider as never);

          expect(provider.sendPlaybackSpeed).not.toHaveBeenCalled();
        });



        it('handles both filterPatterns and playbackSpeed changing at once', () => {
          const provider = makeProvider();
          const event = makeEvent('codegraphy.filterPatterns', 'codegraphy.timeline.playbackSpeed');

          executeConfigAction('general', event as never, provider as never);

          expect(provider.invalidateTimelineCache).toHaveBeenCalledOnce();
          expect(provider.sendPlaybackSpeed).toHaveBeenCalledOnce();
        });
  });
});
