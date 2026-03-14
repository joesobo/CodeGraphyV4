import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGroup } from '../../../../src/shared/types';
import { useEditorState } from '../../../../src/webview/components/settingsPanel/groups/useEditorState';

const sentMessages: unknown[] = [];
vi.mock('../../../../src/webview/lib/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

function latestMessage<T extends { type: string }>(type: T['type']): T | undefined {
  return sentMessages.findLast((message) => (message as { type?: string }).type === type) as T | undefined;
}

describe('useEditorState', () => {
  beforeEach(() => {
    sentMessages.length = 0;
  });

  it('ignores blank patterns when adding a group', () => {
    const setExpandedGroupId = vi.fn();
    const { result } = renderHook(() => useEditorState({ userGroups: [], setExpandedGroupId }));

    expect(result.current.newColor).toBe('#3B82F6');

    act(() => {
      result.current.addGroup();
    });

    expect(sentMessages).toEqual([]);
    expect(setExpandedGroupId).not.toHaveBeenCalled();
  });

  it('adds a trimmed custom group and resets the add form', () => {
    const setExpandedGroupId = vi.fn();
    const { result } = renderHook(() => useEditorState({ userGroups: [], setExpandedGroupId }));

    act(() => {
      result.current.setNewPattern('  src/**  ');
      result.current.setNewColor('#ff00ff');
    });
    act(() => {
      result.current.addGroup();
    });

    expect(latestMessage<{ type: 'UPDATE_GROUPS'; payload: { groups: Array<{ pattern: string; color: string }> } }>('UPDATE_GROUPS'))
      .toMatchObject({
        payload: { groups: [expect.objectContaining({ pattern: 'src/**', color: '#ff00ff' })] },
      });
    expect(result.current.newPattern).toBe('');
    expect(result.current.newColor).toBe('#3B82F6');
    expect(setExpandedGroupId).toHaveBeenCalledWith(expect.any(String));
  });

  it('updates and deletes custom groups through UPDATE_GROUPS', () => {
    const groups: IGroup[] = [
      { id: 'g1', pattern: '*.ts', color: '#3178C6' },
      { id: 'g2', pattern: '*.tsx', color: '#22C55E' },
    ];
    const { result } = renderHook(() =>
      useEditorState({ userGroups: groups, setExpandedGroupId: vi.fn() })
    );

    act(() => {
      result.current.updateGroup('g1', { disabled: true });
      result.current.deleteGroup('g1');
    });

    expect(sentMessages[0]).toMatchObject({
      payload: {
        groups: [
          expect.objectContaining({ id: 'g1', disabled: true }),
          expect.objectContaining({ id: 'g2', pattern: '*.tsx' }),
        ],
      },
    });
    expect(sentMessages[1]).toEqual({
      type: 'UPDATE_GROUPS',
      payload: { groups: [groups[1]] },
    });
  });

  it('builds plugin overrides and expands the new override group', () => {
    const setExpandedGroupId = vi.fn();
    const group: IGroup = {
      id: 'plugin:godot:scenes',
      pattern: 'scenes/**',
      color: '#22C55E',
      imagePath: 'assets/godot.svg',
      isPluginDefault: true,
    };
    const { result } = renderHook(() =>
      useEditorState({ userGroups: [], setExpandedGroupId })
    );

    act(() => {
      result.current.overridePluginGroup(group, { shape2D: 'square' });
    });

    expect(latestMessage<{ type: 'UPDATE_GROUPS'; payload: { groups: Array<{ imagePath?: string; shape2D?: string }> } }>('UPDATE_GROUPS'))
      .toMatchObject({
        payload: { groups: [expect.objectContaining({ imagePath: 'plugin:godot:assets/godot.svg', shape2D: 'square' })] },
      });
    expect(setExpandedGroupId).toHaveBeenCalledWith(expect.any(String));
  });

  it('persists debounced custom color changes and clears the local override', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useEditorState({ userGroups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }], setExpandedGroupId: vi.fn() })
    );

    act(() => {
      result.current.changeGroupColor('g1', '#ff00ff');
    });

    expect(result.current.localColorOverrides).toEqual({ g1: '#ff00ff' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(latestMessage<{ type: 'UPDATE_GROUPS'; payload: { groups: Array<{ color: string }> } }>('UPDATE_GROUPS'))
      .toMatchObject({
        payload: { groups: [expect.objectContaining({ color: '#ff00ff' })] },
      });
    expect(result.current.localColorOverrides).toEqual({});
    vi.useRealTimers();
  });

  it('persists debounced plugin color overrides and clears the local override', () => {
    vi.useFakeTimers();
    const pluginGroup: IGroup = {
      id: 'plugin:typescript:ts',
      pattern: '*.ts',
      color: '#3178C6',
      isPluginDefault: true,
    };
    const { result } = renderHook(() =>
      useEditorState({ userGroups: [], setExpandedGroupId: vi.fn() })
    );

    act(() => {
      result.current.changePluginGroupColor(pluginGroup, '#ff00ff');
    });

    expect(result.current.localColorOverrides).toEqual({ 'plugin:typescript:ts': '#ff00ff' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(latestMessage<{ type: 'UPDATE_GROUPS'; payload: { groups: Array<{ color: string }> } }>('UPDATE_GROUPS'))
      .toMatchObject({
        payload: { groups: [expect.objectContaining({ color: '#ff00ff' })] },
      });
    expect(result.current.localColorOverrides).toEqual({});
    vi.useRealTimers();
  });

  it('persists debounced pattern changes and clears the local override', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useEditorState({ userGroups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }], setExpandedGroupId: vi.fn() })
    );

    act(() => {
      result.current.changeGroupPattern('g1', '*.tsx');
    });

    expect(result.current.localPatternOverrides).toEqual({ g1: '*.tsx' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(latestMessage<{ type: 'UPDATE_GROUPS'; payload: { groups: Array<{ pattern: string }> } }>('UPDATE_GROUPS'))
      .toMatchObject({
        payload: { groups: [expect.objectContaining({ pattern: '*.tsx' })] },
      });
    expect(result.current.localPatternOverrides).toEqual({});
    vi.useRealTimers();
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

  it('reorders dragged groups and clears drag state after drop', () => {
    const groups: IGroup[] = [
      { id: 'a', pattern: 'a/**', color: '#111111' },
      { id: 'b', pattern: 'b/**', color: '#222222' },
    ];
    const { result } = renderHook(() =>
      useEditorState({ userGroups: groups, setExpandedGroupId: vi.fn() })
    );
    const preventDefault = vi.fn();

    act(() => {
      result.current.startGroupDrag(0);
      result.current.overGroupDrag({ preventDefault } as unknown as React.DragEvent, 1);
    });

    act(() => {
      result.current.dropGroup({ preventDefault } as unknown as React.DragEvent, 1);
    });

    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(latestMessage<{ type: 'UPDATE_GROUPS'; payload: { groups: Array<{ id: string }> } }>('UPDATE_GROUPS'))
      .toMatchObject({
        payload: { groups: [{ id: 'b' }, { id: 'a' }] },
      });
    expect(result.current.dragIndex).toBeNull();
    expect(result.current.dragOverIndex).toBeNull();
  });

  it('clears drag state without posting when there is no active drag', () => {
    const { result } = renderHook(() =>
      useEditorState({ userGroups: [{ id: 'a', pattern: 'a/**', color: '#111111' }], setExpandedGroupId: vi.fn() })
    );
    const preventDefault = vi.fn();

    act(() => {
      result.current.dropGroup({ preventDefault } as unknown as React.DragEvent, 0);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(sentMessages).toEqual([]);
    expect(result.current.dragIndex).toBeNull();
    expect(result.current.dragOverIndex).toBeNull();
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

  it('keeps only the latest pending custom color update', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useEditorState({ userGroups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }], setExpandedGroupId: vi.fn() })
    );

    act(() => {
      result.current.changeGroupColor('g1', '#ff00ff');
      result.current.changeGroupColor('g1', '#00ff00');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const messages = sentMessages.filter(
      (message) => (message as { type?: string }).type === 'UPDATE_GROUPS'
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      payload: { groups: [expect.objectContaining({ color: '#00ff00' })] },
    });
    vi.useRealTimers();
  });

  it('keeps only the latest pending plugin color update', () => {
    vi.useFakeTimers();
    const pluginGroup: IGroup = {
      id: 'plugin:typescript:ts',
      pattern: '*.ts',
      color: '#3178C6',
      isPluginDefault: true,
    };
    const { result } = renderHook(() =>
      useEditorState({ userGroups: [], setExpandedGroupId: vi.fn() })
    );

    act(() => {
      result.current.changePluginGroupColor(pluginGroup, '#ff00ff');
      result.current.changePluginGroupColor(pluginGroup, '#00ff00');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const messages = sentMessages.filter(
      (message) => (message as { type?: string }).type === 'UPDATE_GROUPS'
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      payload: { groups: [expect.objectContaining({ color: '#00ff00' })] },
    });
    vi.useRealTimers();
  });

  it('keeps only the latest pending pattern update', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useEditorState({ userGroups: [{ id: 'g1', pattern: '*.ts', color: '#3178C6' }], setExpandedGroupId: vi.fn() })
    );

    act(() => {
      result.current.changeGroupPattern('g1', '*.tsx');
      result.current.changeGroupPattern('g1', '*.cts');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const messages = sentMessages.filter(
      (message) => (message as { type?: string }).type === 'UPDATE_GROUPS'
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      payload: { groups: [expect.objectContaining({ pattern: '*.cts' })] },
    });
    vi.useRealTimers();
  });

  it('clears drag markers when ending a drag interaction', () => {
    const { result } = renderHook(() =>
      useEditorState({ userGroups: [{ id: 'a', pattern: 'a/**', color: '#111111' }], setExpandedGroupId: vi.fn() })
    );

    act(() => {
      result.current.startGroupDrag(0);
      result.current.overGroupDrag({ preventDefault: vi.fn() } as unknown as React.DragEvent, 0);
    });
    expect(result.current.dragIndex).toBe(0);
    expect(result.current.dragOverIndex).toBe(0);

    act(() => {
      result.current.endGroupDrag();
    });

    expect(result.current.dragIndex).toBeNull();
    expect(result.current.dragOverIndex).toBeNull();
  });
});
