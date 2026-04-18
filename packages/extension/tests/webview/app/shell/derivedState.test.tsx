import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { IGroup } from '../../../../src/shared/settings/groups';
import { useFilterLegendInputs } from '../../../../src/webview/app/shell/derivedState';

type HookProps = {
  filterPatterns: string[];
  pluginFilterPatterns: string[];
  legends: IGroup[];
};

describe('app/derivedState', () => {
  it('combines plugin and user filter patterns and removes plugin-default legends from user rules', () => {
    const { result } = renderHook(() =>
      useFilterLegendInputs(
        ['src/**'],
        ['generated/**'],
        [
          { id: 'plugin-default', pattern: 'generated/**', color: '#aaaaaa', isPluginDefault: true },
          { id: 'user-rule', pattern: 'src/**', color: '#00ff00' },
        ],
      ),
    );

    expect(result.current.activeFilterPatterns).toEqual(['generated/**', 'src/**']);
    expect(result.current.userLegendRules).toEqual([
      { id: 'user-rule', pattern: 'src/**', color: '#00ff00' },
    ]);
  });

  it('recomputes filter inputs and user legends when the inputs change', () => {
    const initialProps: HookProps = {
      filterPatterns: ['src/**'],
      pluginFilterPatterns: ['generated/**'],
      legends: [{ id: 'user-rule', pattern: 'src/**', color: '#00ff00' }],
    };
    const updatedProps: HookProps = {
      filterPatterns: ['tests/**'],
      pluginFilterPatterns: ['vendor/**'],
      legends: [
        { id: 'plugin-default', pattern: 'vendor/**', color: '#999999', isPluginDefault: true },
        { id: 'user-rule', pattern: 'tests/**', color: '#ff00ff' },
      ],
    };
    const { result, rerender } = renderHook(
      ({ filterPatterns, pluginFilterPatterns, legends }: HookProps) =>
        useFilterLegendInputs(filterPatterns, pluginFilterPatterns, legends),
      { initialProps },
    );

    rerender(updatedProps);

    expect(result.current.activeFilterPatterns).toEqual(['vendor/**', 'tests/**']);
    expect(result.current.userLegendRules).toEqual([
      { id: 'user-rule', pattern: 'tests/**', color: '#ff00ff' },
    ]);
  });
});
