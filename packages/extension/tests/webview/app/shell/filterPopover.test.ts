import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  buildPendingFilterPatterns,
  useFilterPopoverState,
} from '../../../../src/webview/app/shell/filterPopover';

describe('webview/app/shell/filterPopover', () => {
  it('normalizes requested paths to filter globs and removes empty results', () => {
    expect(buildPendingFilterPatterns(['src/app.ts', '', 'docs'])).toEqual([
      '**/src/app.ts',
      '**/docs',
    ]);
  });

  it('starts closed without pending filter patterns', () => {
    const { result } = renderHook(() => useFilterPopoverState());

    expect(result.current.filterPopoverOpen).toBe(false);
    expect(result.current.pendingFilterPatterns).toEqual([]);
  });

  it('opens with pending patterns and clears them when closed', () => {
    const { result } = renderHook(() => useFilterPopoverState());

    act(() => {
      result.current.openFilterPopoverWithPatterns(['src/app.ts']);
    });

    expect(result.current.filterPopoverOpen).toBe(true);
    expect(result.current.pendingFilterPatterns).toEqual(['**/src/app.ts']);

    act(() => {
      result.current.handleFilterPopoverOpenChange(false);
    });

    expect(result.current.filterPopoverOpen).toBe(false);
    expect(result.current.pendingFilterPatterns).toEqual([]);
  });

  it('keeps pending patterns while the popover is opened again', () => {
    const { result } = renderHook(() => useFilterPopoverState());

    act(() => {
      result.current.openFilterPopoverWithPatterns(['src/app.ts']);
    });

    act(() => {
      result.current.handleFilterPopoverOpenChange(true);
    });

    expect(result.current.filterPopoverOpen).toBe(true);
    expect(result.current.pendingFilterPatterns).toEqual(['**/src/app.ts']);
  });
});
