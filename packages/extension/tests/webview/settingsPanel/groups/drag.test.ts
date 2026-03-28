import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { IGroup } from '../../../../src/shared/contracts';
import { createGroupDragHandlers } from '../../../../src/webview/components/settingsPanel/groups/drag';

describe('settingsPanel groups drag', () => {
  it('reorders dragged groups and clears drag state after drop', () => {
    let dragIndex: number | null = null;
    let dragOverIndex: number | null = null;
    const setDragIndex = vi.fn((value: number | null) => {
      dragIndex = value;
    });
    const setDragOverIndex = vi.fn((value: number | null) => {
      dragOverIndex = value;
    });
    const sendUserGroups = vi.fn();
    const userGroups: IGroup[] = [
      { id: 'a', pattern: 'a/**', color: '#111111' },
      { id: 'b', pattern: 'b/**', color: '#222222' },
    ];
    const preventDefault = vi.fn();

    const start = createGroupDragHandlers({
      dragIndex,
      sendUserGroups,
      setDragIndex: setDragIndex as never,
      setDragOverIndex: setDragOverIndex as never,
      userGroups,
    });
    start.startGroupDrag(0);
    start.overGroupDrag({ preventDefault } as React.DragEvent, 1);

    const drop = createGroupDragHandlers({
      dragIndex,
      sendUserGroups,
      setDragIndex: setDragIndex as never,
      setDragOverIndex: setDragOverIndex as never,
      userGroups,
    });
    drop.dropGroup({ preventDefault } as React.DragEvent, 1);

    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(sendUserGroups).toHaveBeenCalledWith([
      { id: 'b', pattern: 'b/**', color: '#222222' },
      { id: 'a', pattern: 'a/**', color: '#111111' },
    ]);
    expect(dragIndex).toBeNull();
    expect(dragOverIndex).toBeNull();
  });

  it('clears drag state without posting when there is no active drag', () => {
    const setDragIndex = vi.fn();
    const setDragOverIndex = vi.fn();
    const sendUserGroups = vi.fn();
    const preventDefault = vi.fn();
    const handlers = createGroupDragHandlers({
      dragIndex: null,
      sendUserGroups,
      setDragIndex: setDragIndex as never,
      setDragOverIndex: setDragOverIndex as never,
      userGroups: [{ id: 'a', pattern: 'a/**', color: '#111111' }],
    });

    handlers.dropGroup({ preventDefault } as React.DragEvent, 0);

    expect(preventDefault).toHaveBeenCalled();
    expect(sendUserGroups).not.toHaveBeenCalled();
    expect(setDragIndex).toHaveBeenCalledWith(null);
    expect(setDragOverIndex).toHaveBeenCalledWith(null);
  });

  it('clears drag markers when ending a drag interaction', () => {
    const setDragIndex = vi.fn();
    const setDragOverIndex = vi.fn();
    const handlers = createGroupDragHandlers({
      dragIndex: 0,
      sendUserGroups: vi.fn(),
      setDragIndex: setDragIndex as never,
      setDragOverIndex: setDragOverIndex as never,
      userGroups: [{ id: 'a', pattern: 'a/**', color: '#111111' }],
    });

    handlers.endGroupDrag();

    expect(setDragIndex).toHaveBeenCalledWith(null);
    expect(setDragOverIndex).toHaveBeenCalledWith(null);
  });
});
