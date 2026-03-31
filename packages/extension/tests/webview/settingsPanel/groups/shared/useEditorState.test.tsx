import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorState } from '../../../../../src/webview/components/settingsPanel/groups/shared/state/useEditorState';
import type { GraphState } from '../../../../../src/webview/store/state';
import { graphStore } from '../../../../../src/webview/store/state';

const sentMessages: unknown[] = [];
vi.mock('../../../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

describe('useEditorState', () => {
  let originalSetGroups: GraphState['setGroups'];

  beforeEach(() => {
    sentMessages.length = 0;
    originalSetGroups = graphStore.getState().setGroups;
    graphStore.getState().setGroups = vi.fn();
  });

  afterEach(() => {
    graphStore.getState().setGroups = originalSetGroups;
  });

  it('starts new custom groups with the default color', () => {
    const { result } = renderHook(() =>
      useEditorState({ groups: [], userGroups: [], setExpandedGroupId: vi.fn() })
    );

    expect(result.current.newColor).toBe('#3B82F6');
  });

  it('tracks plugin section expansion state', () => {
    const { result } = renderHook(() =>
      useEditorState({ groups: [], userGroups: [], setExpandedGroupId: vi.fn() })
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
      useEditorState({
        groups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
        userGroups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
        setExpandedGroupId: vi.fn(),
      })
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

  it('keeps custom group typing local until settings changes come back', () => {
    const setGroups = graphStore.getState().setGroups;
    const { result } = renderHook(() =>
      useEditorState({
        groups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
        userGroups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
        setExpandedGroupId: vi.fn(),
      })
    );

    act(() => {
      result.current.changeGroupPattern('g1', '*.tsx');
      result.current.changeGroupColor('g1', '#ff00ff');
    });

    expect(setGroups).not.toHaveBeenCalled();
    expect(result.current.localPatternOverrides).toEqual({ g1: '*.tsx' });
    expect(result.current.localColorOverrides).toEqual({ g1: '#ff00ff' });
  });

  it('clears a local pattern override after the host resolves the optimistic update', () => {
    const { result } = renderHook(() =>
      useEditorState({
        groups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
        userGroups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }],
        setExpandedGroupId: vi.fn(),
      })
    );

    act(() => {
      result.current.changeGroupPattern('g1', '*.tsx');
      graphStore.getState().clearOptimisticGroupUpdate('g1');
    });

    expect(result.current.localPatternOverrides).toEqual({});
  });

  it('wires drag handlers through to reordered group updates', () => {
    const { result } = renderHook(() =>
      useEditorState({
        groups: [
          { id: 'g1', pattern: '*.ts', color: '#3178C6' },
          { id: 'g2', pattern: '*.tsx', color: '#22C55E' },
        ],
        userGroups: [
          { id: 'g1', pattern: '*.ts', color: '#3178C6' },
          { id: 'g2', pattern: '*.tsx', color: '#22C55E' },
        ],
        setExpandedGroupId: vi.fn(),
      })
    );

    act(() => {
      result.current.startGroupDrag(0);
    });
    expect(result.current.dragIndex).toBe(0);

    act(() => {
      result.current.overGroupDrag({ preventDefault: vi.fn() } as unknown as React.DragEvent, 1);
    });
    expect(result.current.dragOverIndex).toBe(1);

    act(() => {
      result.current.dropGroup({ preventDefault: vi.fn() } as unknown as React.DragEvent, 1);
    });

    expect(result.current.dragIndex).toBeNull();
    expect(result.current.dragOverIndex).toBeNull();
  });
});
