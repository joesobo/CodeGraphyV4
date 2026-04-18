import type React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFilterController } from '../../../../src/webview/components/settingsPanel/filters/controller';
import { graphStore } from '../../../../src/webview/store/state';

const sentMessages: unknown[] = [];
vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

function setStoreState(overrides: Record<string, unknown> = {}) {
  graphStore.setState({
    filterPatterns: [],
    maxFiles: 500,
    pluginFilterPatterns: [],
    showOrphans: true,
    ...overrides,
  });
}

describe('filters controller', () => {
  beforeEach(() => {
    sentMessages.length = 0;
  });

  it('exposes the current filter state from the graph store', () => {
    setStoreState({
      filterPatterns: ['**/*.test.ts'],
      maxFiles: 250,
      pluginFilterPatterns: ['**/*.generated.ts'],
      showOrphans: false,
    });

    const { result } = renderHook(() => useFilterController());

    expect(result.current.filterPatterns).toEqual(['**/*.test.ts']);
    expect(result.current.maxFiles).toBe(250);
    expect(result.current.pluginFilterPatterns).toEqual(['**/*.generated.ts']);
    expect(result.current.showOrphans).toBe(false);
    expect(result.current.newFilterPattern).toBe('');
  });

  it('adds trimmed patterns and clears the draft', () => {
    setStoreState();
    const { result } = renderHook(() => useFilterController());

    act(() => {
      result.current.onPatternChange('  **/*.cache  ');
    });

    act(() => {
      result.current.onAddPattern();
    });

    expect(graphStore.getState().filterPatterns).toEqual(['**/*.cache']);
    expect(result.current.newFilterPattern).toBe('');
  });

  it('deletes patterns from the store and posts the updated list', () => {
    setStoreState({ filterPatterns: ['**/*.cache', '**/*.log'] });
    const { result } = renderHook(() => useFilterController());

    act(() => {
      result.current.onDeletePattern('**/*.cache');
    });

    expect(graphStore.getState().filterPatterns).toEqual(['**/*.log']);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: ['**/*.log'] },
    });
  });

  it('edits patterns in the store and posts the updated list', () => {
    setStoreState({ filterPatterns: ['**/*.cache', '**/*.log'] });
    const { result } = renderHook(() => useFilterController());

    act(() => {
      result.current.onEditPattern('**/*.cache', '**/*.tmp');
    });

    expect(graphStore.getState().filterPatterns).toEqual(['**/*.tmp', '**/*.log']);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: ['**/*.tmp', '**/*.log'] },
    });
  });

  it('decreases max files by one hundred and clamps at one', () => {
    setStoreState({ maxFiles: 50 });
    const { result } = renderHook(() => useFilterController());

    act(() => {
      result.current.onDecreaseMaxFiles();
    });

    expect(graphStore.getState().maxFiles).toBe(1);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_MAX_FILES',
      payload: { maxFiles: 1 },
    });
  });

  it('increases max files by one hundred', () => {
    setStoreState({ maxFiles: 500 });
    const { result } = renderHook(() => useFilterController());

    act(() => {
      result.current.onIncreaseMaxFiles();
    });

    expect(graphStore.getState().maxFiles).toBe(600);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_MAX_FILES',
      payload: { maxFiles: 600 },
    });
  });

  it('updates max files optimistically for valid input changes only', () => {
    setStoreState({ maxFiles: 500 });
    const { result } = renderHook(() => useFilterController());

    act(() => {
      result.current.onMaxFilesChange('275');
    });

    expect(graphStore.getState().maxFiles).toBe(275);

    act(() => {
      result.current.onMaxFilesChange('abc');
    });

    expect(graphStore.getState().maxFiles).toBe(275);
  });

  it('commits parsed max files on blur and falls back to one for invalid values', () => {
    setStoreState({ maxFiles: 500 });
    const { result } = renderHook(() => useFilterController());

    act(() => {
      result.current.onMaxFilesBlur('250');
    });

    expect(graphStore.getState().maxFiles).toBe(250);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_MAX_FILES',
      payload: { maxFiles: 250 },
    });

    sentMessages.length = 0;

    act(() => {
      result.current.onMaxFilesBlur('not-a-number');
    });

    expect(graphStore.getState().maxFiles).toBe(1);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_MAX_FILES',
      payload: { maxFiles: 1 },
    });
  });

  it('publishes max-file updates on enter', () => {
    setStoreState({ maxFiles: 500 });
    const { result } = renderHook(() => useFilterController());

    act(() => {
      result.current.onMaxFilesKeyDown({
        key: 'Enter',
        currentTarget: { value: '350' },
      } as React.KeyboardEvent<HTMLInputElement>);
    });

    expect(graphStore.getState().maxFiles).toBe(350);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_MAX_FILES',
      payload: { maxFiles: 350 },
    });
  });

  it('ignores non-enter key presses for max-file input commits', () => {
    setStoreState({ maxFiles: 500 });
    const { result } = renderHook(() => useFilterController());

    act(() => {
      result.current.onMaxFilesKeyDown({
        key: 'Escape',
        currentTarget: { value: '350' },
      } as React.KeyboardEvent<HTMLInputElement>);
    });

    expect(graphStore.getState().maxFiles).toBe(500);
    expect(sentMessages).toEqual([]);
  });

  it('updates orphan visibility and posts the new flag', () => {
    setStoreState({ showOrphans: true });
    const { result } = renderHook(() => useFilterController());

    act(() => {
      result.current.onShowOrphansChange(false);
    });

    expect(graphStore.getState().showOrphans).toBe(false);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_SHOW_ORPHANS',
      payload: { showOrphans: false },
    });
  });
});
