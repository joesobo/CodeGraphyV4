import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFilterLegendInputs } from '../../../src/webview/app/derivedState';

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
});
