import { describe, expect, it } from 'vitest';
import { loadGraphViewDisabledState } from '../../../../src/extension/graphView/settings/disabled';

describe('graphView/settings/disabled', () => {
  it('resolves disabled rules and plugins from config inspection and workspace state fallbacks', () => {
    const state = loadGraphViewDisabledState(new Set(['old.rule']), new Set(['old.plugin']), {
      disabledRulesInspect: { workspaceValue: ['rule.alpha'] },
      disabledPluginsInspect: undefined,
      persistedDisabledRules: ['legacy.rule'],
      persistedDisabledPlugins: ['legacy.plugin'],
    });

    expect(state.disabledRules).toEqual(new Set(['rule.alpha']));
    expect(state.disabledPlugins).toEqual(new Set(['legacy.plugin']));
    expect(state.changed).toBe(true);
  });
});
