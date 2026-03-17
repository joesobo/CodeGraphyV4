import type React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFilterController } from '../../../../src/webview/components/settingsPanel/filters/controller';
import { graphStore } from '../../../../src/webview/store';

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
});
