import { describe, expect, it, vi } from 'vitest';
import {
  getDisabledFilterPatternConfigKey,
  getFilterPatternStateOverrideKey,
  getGroupDisabledFilterPatterns,
  getNextDisabledFilterPatterns,
} from '../../../../../../../src/extension/graphView/webview/settingsMessages/updates/apply/filterPatternKeys';
import { createHandlers, createState } from '../../testSupport';

describe('settingsMessages/updates/apply/filterPatternKeys', () => {
  it('removes enabled patterns and adds disabled patterns', () => {
    expect(getNextDisabledFilterPatterns(['dist/**', 'coverage/**'], 'dist/**', true)).toEqual([
      'coverage/**',
    ]);
    expect(getNextDisabledFilterPatterns(['dist/**'], 'coverage/**', false)).toEqual([
      'dist/**',
      'coverage/**',
    ]);
  });

  it('maps custom and plugin sources to config keys and payload override keys', () => {
    expect(getDisabledFilterPatternConfigKey('custom')).toBe('disabledCustomFilterPatterns');
    expect(getDisabledFilterPatternConfigKey('plugin')).toBe('disabledPluginFilterPatterns');
    expect(getFilterPatternStateOverrideKey('custom')).toBe('disabledCustomPatterns');
    expect(getFilterPatternStateOverrideKey('plugin')).toBe('disabledPluginPatterns');
  });

  it('returns no disabled group patterns when a group is enabled', () => {
    expect(getGroupDisabledFilterPatterns('custom', true, createState({
      filterPatterns: ['dist/**'],
    }), createHandlers())).toEqual([]);
  });

  it('returns custom group patterns from state and plugin group patterns from handlers', () => {
    const handlers = createHandlers({
      getPluginFilterPatterns: vi.fn(() => ['venv/**']),
    });

    expect(getGroupDisabledFilterPatterns('custom', false, createState({
      filterPatterns: ['dist/**'],
    }), handlers)).toEqual(['dist/**']);
    expect(getGroupDisabledFilterPatterns('plugin', false, createState(), handlers)).toEqual(['venv/**']);
  });
});
