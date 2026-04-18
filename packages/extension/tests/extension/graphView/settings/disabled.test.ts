import { describe, expect, it } from 'vitest';
import { loadGraphViewDisabledState } from '../../../../src/extension/graphView/settings/disabled';

describe('graphView/settings/disabled', () => {
  it('resolves disabled plugins from config inspection values', () => {
    const state = loadGraphViewDisabledState(new Set(['old.plugin']), {
      configuredDisabledPlugins: undefined,
      disabledPluginsInspect: { globalValue: ['plugin.beta'] },
    });

    expect(state.disabledPlugins).toEqual(new Set(['plugin.beta']));
    expect(state.changed).toBe(true);
  });

  it('prefers the current configured disabled plugins over inspection fallbacks', () => {
    const state = loadGraphViewDisabledState(new Set(['old.plugin']), {
      configuredDisabledPlugins: ['plugin.current'],
      disabledPluginsInspect: { globalValue: ['plugin.stale'] },
    });

    expect(state.disabledPlugins).toEqual(new Set(['plugin.current']));
    expect(state.changed).toBe(true);
  });

  it('tolerates a missing inspection result', () => {
    const state = loadGraphViewDisabledState(new Set(), {
      configuredDisabledPlugins: undefined,
      disabledPluginsInspect: undefined,
    });

    expect(state.disabledPlugins).toEqual(new Set());
    expect(state.changed).toBe(false);
  });
});
