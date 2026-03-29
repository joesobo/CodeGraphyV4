import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeConfigAction } from '../../../src/extension/config/actions';

function makeProvider() {
  return {
    refreshPhysicsSettings: vi.fn(),
    refreshToggleSettings: vi.fn(),
    refreshSettings: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
    emitEvent: vi.fn(),
    invalidateTimelineCache: vi.fn().mockResolvedValue(undefined),
    sendPlaybackSpeed: vi.fn(),
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

  it('does not call any refresh method for groups category', () => {
    const provider = makeProvider();
    const event = makeEvent();

    executeConfigAction('groups', event as never, provider as never);

    expect(provider.refreshPhysicsSettings).not.toHaveBeenCalled();
    expect(provider.refreshToggleSettings).not.toHaveBeenCalled();
    expect(provider.refreshSettings).not.toHaveBeenCalled();
    expect(provider.refresh).not.toHaveBeenCalled();
  });

  describe('general category', () => {
    it('calls refresh and emitEvent for general category', () => {
      const provider = makeProvider();
      const event = makeEvent();

      executeConfigAction('general', event as never, provider as never);

      expect(provider.refresh).toHaveBeenCalledOnce();
      expect(provider.emitEvent).toHaveBeenCalledWith('workspace:configChanged', {
        key: 'codegraphy',
        value: undefined,
        old: undefined,
      });
    });

    it('invalidates timeline cache when filterPatterns changes', () => {
      const provider = makeProvider();
      const event = makeEvent('codegraphy.filterPatterns');

      executeConfigAction('general', event as never, provider as never);

      expect(provider.invalidateTimelineCache).toHaveBeenCalledOnce();
    });

    it('invalidates timeline cache when timeline.maxCommits changes', () => {
      const provider = makeProvider();
      const event = makeEvent('codegraphy.timeline.maxCommits');

      executeConfigAction('general', event as never, provider as never);

      expect(provider.invalidateTimelineCache).toHaveBeenCalledOnce();
    });

    it('does not invalidate timeline cache when unrelated config changes', () => {
      const provider = makeProvider();
      const event = makeEvent();

      executeConfigAction('general', event as never, provider as never);

      expect(provider.invalidateTimelineCache).not.toHaveBeenCalled();
    });

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
