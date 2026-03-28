/**
 * Tests targeting surviving mutants in searchBarHandlers.ts:
 * - L19:6 ArrayDeclaration: [] (toggleOption dependency array [options, onOptionsChange])
 * - L26:6 ArrayDeclaration: [] (handleClear dependency array [onChange])
 *
 * These mutants survive when the useCallback dependency arrays are emptied,
 * meaning the callbacks become stale when their dependencies change.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchBarHandlers } from '../../../src/webview/components/searchBarHandlers';
import type { SearchOptions } from '../../../src/webview/components/searchBarTypes';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('searchBarHandlers dependency array mutations', () => {
  it('toggleOption uses the latest options when options change between renders', () => {
    // If L19 dependency array is mutated to [], toggleOption would capture stale options
    const onOptionsChange = vi.fn();
    const initialOptions: SearchOptions = { matchCase: false, wholeWord: false, regex: false };
    const updatedOptions: SearchOptions = { matchCase: true, wholeWord: false, regex: false };

    const { result, rerender } = renderHook(
      ({ options }) => useSearchBarHandlers(options, onOptionsChange, vi.fn()),
      { initialProps: { options: initialOptions } },
    );

    // Rerender with new options (matchCase is now true)
    rerender({ options: updatedOptions });

    // Now toggle matchCase — it should toggle from true to false
    act(() => {
      result.current.toggleOption('matchCase');
    });

    expect(onOptionsChange).toHaveBeenCalledWith({
      matchCase: false, // toggled from true to false
      wholeWord: false,
      regex: false,
    });
  });

  it('toggleOption uses the latest onOptionsChange callback after re-render', () => {
    // If L19 dependency array is mutated to [], toggleOption would use stale onOptionsChange
    const onOptionsChange1 = vi.fn();
    const onOptionsChange2 = vi.fn();
    const options: SearchOptions = { matchCase: false, wholeWord: false, regex: false };

    const { result, rerender } = renderHook(
      ({ onOptionsChange }) => useSearchBarHandlers(options, onOptionsChange, vi.fn()),
      { initialProps: { onOptionsChange: onOptionsChange1 } },
    );

    rerender({ onOptionsChange: onOptionsChange2 });

    act(() => {
      result.current.toggleOption('matchCase');
    });

    // Should call the new callback, not the old one
    expect(onOptionsChange1).not.toHaveBeenCalled();
    expect(onOptionsChange2).toHaveBeenCalledOnce();
  });

  it('handleClear uses the latest onChange callback after re-render', () => {
    // If L26 dependency array is mutated to [], handleClear would use stale onChange
    const onChange1 = vi.fn();
    const onChange2 = vi.fn();
    const options: SearchOptions = { matchCase: false, wholeWord: false, regex: false };

    const { result, rerender } = renderHook(
      ({ onChange }) => useSearchBarHandlers(options, vi.fn(), onChange),
      { initialProps: { onChange: onChange1 } },
    );

    rerender({ onChange: onChange2 });

    act(() => {
      result.current.handleClear();
    });

    // Should call the new callback, not the old one
    expect(onChange1).not.toHaveBeenCalled();
    expect(onChange2).toHaveBeenCalledWith('');
  });
});
