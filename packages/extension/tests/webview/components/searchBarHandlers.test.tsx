import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchBarHandlers } from '../../../src/webview/components/searchBarHandlers';
import type { SearchOptions } from '../../../src/webview/components/searchBarTypes';

describe('useSearchBarHandlers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an inputRef', () => {
    const { result } = renderHook(() =>
      useSearchBarHandlers(
        { matchCase: false, wholeWord: false, regex: false },
        vi.fn(),
        vi.fn()
      )
    );
    expect(result.current.inputRef).toBeDefined();
    expect(result.current.inputRef.current).toBeNull();
  });

  it('toggleOption toggles matchCase from false to true', () => {
    const onOptionsChange = vi.fn();
    const options: SearchOptions = { matchCase: false, wholeWord: false, regex: false };
    const { result } = renderHook(() =>
      useSearchBarHandlers(options, onOptionsChange, vi.fn())
    );

    act(() => {
      result.current.toggleOption('matchCase');
    });

    expect(onOptionsChange).toHaveBeenCalledWith({
      matchCase: true,
      wholeWord: false,
      regex: false,
    });
  });

  it('toggleOption toggles matchCase from true to false', () => {
    const onOptionsChange = vi.fn();
    const options: SearchOptions = { matchCase: true, wholeWord: false, regex: false };
    const { result } = renderHook(() =>
      useSearchBarHandlers(options, onOptionsChange, vi.fn())
    );

    act(() => {
      result.current.toggleOption('matchCase');
    });

    expect(onOptionsChange).toHaveBeenCalledWith({
      matchCase: false,
      wholeWord: false,
      regex: false,
    });
  });

  it('toggleOption toggles wholeWord', () => {
    const onOptionsChange = vi.fn();
    const options: SearchOptions = { matchCase: false, wholeWord: false, regex: false };
    const { result } = renderHook(() =>
      useSearchBarHandlers(options, onOptionsChange, vi.fn())
    );

    act(() => {
      result.current.toggleOption('wholeWord');
    });

    expect(onOptionsChange).toHaveBeenCalledWith({
      matchCase: false,
      wholeWord: true,
      regex: false,
    });
  });

  it('toggleOption toggles regex', () => {
    const onOptionsChange = vi.fn();
    const options: SearchOptions = { matchCase: false, wholeWord: false, regex: false };
    const { result } = renderHook(() =>
      useSearchBarHandlers(options, onOptionsChange, vi.fn())
    );

    act(() => {
      result.current.toggleOption('regex');
    });

    expect(onOptionsChange).toHaveBeenCalledWith({
      matchCase: false,
      wholeWord: false,
      regex: true,
    });
  });

  it('handleClear clears the value', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useSearchBarHandlers(
        { matchCase: false, wholeWord: false, regex: false },
        vi.fn(),
        onChange
      )
    );

    act(() => {
      result.current.handleClear();
    });

    expect(onChange).toHaveBeenCalledWith('');
  });
});
