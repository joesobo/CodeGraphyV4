import { describe, expect, it } from 'vitest';
import { loadGraphViewDisabledState } from '../../../../src/extension/graphView/settings/disabled';

describe('graphView/settings/disabled', () => {
  it('resolves disabled plugins from config inspection values', () => {
    const state = loadGraphViewDisabledState(new Set(['old.plugin']), {
      disabledPluginsInspect: { globalValue: ['plugin.beta'] },
    });

    expect(state.disabledPlugins).toEqual(new Set(['plugin.beta']));
    expect(state.changed).toBe(true);
  });
});
