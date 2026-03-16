import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorState } from '../../../../src/webview/components/settingsPanel/groups/useEditorState';

const sentMessages: unknown[] = [];
vi.mock('../../../../src/webview/lib/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

describe('useEditorState', () => {
  beforeEach(() => {
    sentMessages.length = 0;
  });

  it('tracks plugin section expansion state', () => {
    const { result } = renderHook(() =>
      useEditorState({ userGroups: [], setExpandedGroupId: vi.fn() })
    );

    act(() => {
      result.current.togglePluginExpansion('typescript');
    });
    expect(result.current.expandedPluginIds.has('typescript')).toBe(true);

    act(() => {
      result.current.togglePluginExpansion('typescript');
    });
    expect(result.current.expandedPluginIds.has('typescript')).toBe(false);
  });

  it('cancels pending timers on unmount', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() =>
      useEditorState({ userGroups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }], setExpandedGroupId: vi.fn() })
    );

    act(() => {
      result.current.changeGroupColor('g1', '#ff00ff');
      result.current.changeGroupPattern('g1', '*.tsx');
    });
    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(sentMessages).toEqual([]);
    vi.useRealTimers();
  });
});
