import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  isSectionEnabled,
  useFilterSectionState,
} from '../../../../../src/webview/components/searchBar/filters/popover/sectionState';

interface SectionStateProps {
  disabledCustom: string[];
  disabledPlugin: string[];
  pluginGroups: Array<{ pluginId: string; pluginName: string; patterns: string[] }>;
}

describe('searchBar/filters/popover/sectionState', () => {
  it('detects whether any pattern remains enabled', () => {
    expect(isSectionEnabled(['one/**', 'two/**'], new Set(['one/**']))).toBe(true);
    expect(isSectionEnabled(['one/**'], new Set(['one/**']))).toBe(false);
    expect(isSectionEnabled([], new Set())).toBe(false);
  });

  it('builds disabled sets and falls back to a generic plugin group', () => {
    const { result, rerender } = renderHook(
      ({ disabledCustom, disabledPlugin, pluginGroups }: SectionStateProps) => useFilterSectionState(
        ['custom/**'],
        disabledCustom,
        disabledPlugin,
        pluginGroups,
        ['plugin/**'],
      ),
      {
        initialProps: {
          disabledCustom: ['custom/**'],
          disabledPlugin: [] as string[],
          pluginGroups: [] as SectionStateProps['pluginGroups'],
        },
      },
    );

    expect(result.current.customSectionEnabled).toBe(false);
    expect(result.current.pluginSectionEnabled).toBe(true);
    expect(result.current.disabledCustom.has('custom/**')).toBe(true);
    expect(result.current.visiblePluginGroups).toEqual([{
      pluginId: 'plugin-defaults',
      pluginName: 'Plugin defaults',
      patterns: ['plugin/**'],
    }]);

    rerender({
      disabledCustom: [],
      disabledPlugin: ['plugin/**'],
      pluginGroups: [{ pluginId: 'plugin.one', pluginName: 'Plugin One', patterns: ['plugin/**'] }],
    });

    expect(result.current.customSectionEnabled).toBe(true);
    expect(result.current.pluginSectionEnabled).toBe(false);
    expect(result.current.disabledPlugin.has('plugin/**')).toBe(true);
    expect(result.current.visiblePluginGroups[0]?.pluginId).toBe('plugin.one');
  });
});
