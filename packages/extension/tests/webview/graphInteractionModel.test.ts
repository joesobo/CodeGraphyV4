import { describe, it, expect } from 'vitest';
import {
  getBackgroundClickCommand,
  getLinkClickCommand,
  getNodeClickCommand,
  getNodeContextMenuSelection,
  shouldMarkRightMouseDrag,
  shouldUseRightClickFallback,
} from '../../src/webview/components/graphInteractionModel';

describe('graphInteractionModel', () => {
  it('keeps the current selection when right-clicking an already selected node', () => {
    expect(getNodeContextMenuSelection('src/app.ts', ['src/app.ts', 'src/utils.ts'])).toEqual({
      nodeIds: ['src/app.ts', 'src/utils.ts'],
      shouldUpdateSelection: false,
    });
  });

  it('selects only the target node when right-clicking an unselected node', () => {
    expect(getNodeContextMenuSelection('src/app.ts', ['src/utils.ts'])).toEqual({
      nodeIds: ['src/app.ts'],
      shouldUpdateSelection: true,
    });
  });

  it('opens the node context menu for mac control-click', () => {
    const result = getNodeClickCommand({
      nodeId: 'src/app.ts',
      label: 'app.ts',
      ctrlKey: true,
      shiftKey: false,
      metaKey: false,
      clientX: 12,
      clientY: 24,
      isMacPlatform: true,
      selectedNodeIds: [],
      lastClick: null,
      now: 200,
      doubleClickThresholdMs: 450,
    });

    expect(result).toEqual({
      nextLastClick: null,
      effects: [{ kind: 'openNodeContextMenu', nodeId: 'src/app.ts' }],
    });
  });

  it('opens and focuses the node on double-click within the threshold', () => {
    const result = getNodeClickCommand({
      nodeId: 'src/app.ts',
      label: 'app.ts',
      ctrlKey: false,
      shiftKey: false,
      metaKey: false,
      clientX: 12,
      clientY: 24,
      isMacPlatform: false,
      selectedNodeIds: ['src/utils.ts'],
      lastClick: { nodeId: 'src/app.ts', time: 100 },
      now: 200,
      doubleClickThresholdMs: 450,
    });

    expect(result).toEqual({
      nextLastClick: null,
      effects: [
        { kind: 'selectOnlyNode', nodeId: 'src/app.ts' },
        { kind: 'openNode', nodeId: 'src/app.ts' },
        { kind: 'focusNode', nodeId: 'src/app.ts' },
        {
          kind: 'sendInteraction',
          event: 'graph:nodeDoubleClick',
          payload: {
            node: { id: 'src/app.ts', label: 'app.ts' },
            event: { x: 12, y: 24 },
          },
        },
      ],
    });
  });

  it('starts a new click sequence when the double-click threshold has expired', () => {
    const result = getNodeClickCommand({
      nodeId: 'src/app.ts',
      label: 'app.ts',
      ctrlKey: false,
      shiftKey: false,
      metaKey: false,
      clientX: 12,
      clientY: 24,
      isMacPlatform: false,
      selectedNodeIds: [],
      lastClick: { nodeId: 'src/app.ts', time: 100 },
      now: 700,
      doubleClickThresholdMs: 450,
    });

    expect(result).toEqual({
      nextLastClick: { nodeId: 'src/app.ts', time: 700 },
      effects: [
        { kind: 'selectOnlyNode', nodeId: 'src/app.ts' },
        { kind: 'previewNode', nodeId: 'src/app.ts' },
        {
          kind: 'sendInteraction',
          event: 'graph:nodeClick',
          payload: {
            node: { id: 'src/app.ts', label: 'app.ts' },
            event: { x: 12, y: 24 },
          },
        },
      ],
    });
  });

  it('starts a new click sequence when the click lands exactly on the double-click threshold', () => {
    const result = getNodeClickCommand({
      nodeId: 'src/app.ts',
      label: 'app.ts',
      ctrlKey: false,
      shiftKey: false,
      metaKey: false,
      clientX: 12,
      clientY: 24,
      isMacPlatform: false,
      selectedNodeIds: [],
      lastClick: { nodeId: 'src/app.ts', time: 100 },
      now: 550,
      doubleClickThresholdMs: 450,
    });

    expect(result).toEqual({
      nextLastClick: { nodeId: 'src/app.ts', time: 550 },
      effects: [
        { kind: 'selectOnlyNode', nodeId: 'src/app.ts' },
        { kind: 'previewNode', nodeId: 'src/app.ts' },
        {
          kind: 'sendInteraction',
          event: 'graph:nodeClick',
          payload: {
            node: { id: 'src/app.ts', label: 'app.ts' },
            event: { x: 12, y: 24 },
          },
        },
      ],
    });
  });

  it('adds a node to the multi-selection on modifier click', () => {
    const result = getNodeClickCommand({
      nodeId: 'src/utils.ts',
      label: 'utils.ts',
      ctrlKey: true,
      shiftKey: false,
      metaKey: false,
      clientX: 8,
      clientY: 16,
      isMacPlatform: false,
      selectedNodeIds: ['src/app.ts'],
      lastClick: null,
      now: 200,
      doubleClickThresholdMs: 450,
    });

    expect(result).toEqual({
      nextLastClick: { nodeId: 'src/utils.ts', time: 200 },
      effects: [
        { kind: 'setSelection', nodeIds: ['src/app.ts', 'src/utils.ts'] },
        {
          kind: 'sendInteraction',
          event: 'graph:nodeClick',
          payload: {
            node: { id: 'src/utils.ts', label: 'utils.ts' },
            event: { x: 8, y: 16 },
          },
        },
      ],
    });
  });

  it('removes a node from the multi-selection when it is clicked again with a modifier', () => {
    const result = getNodeClickCommand({
      nodeId: 'src/utils.ts',
      label: 'utils.ts',
      ctrlKey: false,
      shiftKey: true,
      metaKey: false,
      clientX: 8,
      clientY: 16,
      isMacPlatform: false,
      selectedNodeIds: ['src/app.ts', 'src/utils.ts'],
      lastClick: null,
      now: 200,
      doubleClickThresholdMs: 450,
    });

    expect(result).toEqual({
      nextLastClick: { nodeId: 'src/utils.ts', time: 200 },
      effects: [
        { kind: 'setSelection', nodeIds: ['src/app.ts'] },
        {
          kind: 'sendInteraction',
          event: 'graph:nodeClick',
          payload: {
            node: { id: 'src/utils.ts', label: 'utils.ts' },
            event: { x: 8, y: 16 },
          },
        },
      ],
    });
  });

  it('opens the background context menu for mac control-click', () => {
    expect(getBackgroundClickCommand({ ctrlKey: true, isMacPlatform: true })).toEqual([
      { kind: 'openBackgroundContextMenu' },
    ]);
  });

  it('clears the selection on a normal background click', () => {
    expect(getBackgroundClickCommand({ ctrlKey: false, isMacPlatform: false })).toEqual([
      { kind: 'clearSelection' },
      { kind: 'sendInteraction', event: 'graph:backgroundClick', payload: {} },
    ]);
  });

  it('opens the edge context menu for mac control-click', () => {
    expect(getLinkClickCommand({ ctrlKey: true, isMacPlatform: true })).toEqual([
      { kind: 'openEdgeContextMenu' },
    ]);
  });

  it('ignores normal link clicks', () => {
    expect(getLinkClickCommand({ ctrlKey: false, isMacPlatform: false })).toEqual([]);
  });

  it('keeps right-click drag inactive while movement stays within the threshold', () => {
    expect(shouldMarkRightMouseDrag({ startX: 10, startY: 20, nextX: 12, nextY: 22, thresholdPx: 6 })).toBe(false);
  });

  it('marks right-click drag as moved once the threshold is exceeded', () => {
    expect(shouldMarkRightMouseDrag({ startX: 10, startY: 20, nextX: 20, nextY: 30, thresholdPx: 6 })).toBe(true);
  });

  it('marks right-click drag as moved when horizontal movement alone exceeds the threshold', () => {
    expect(shouldMarkRightMouseDrag({ startX: 10, startY: 20, nextX: 17, nextY: 20, thresholdPx: 6 })).toBe(true);
  });

  it('marks right-click drag as moved when vertical movement alone exceeds the threshold', () => {
    expect(shouldMarkRightMouseDrag({ startX: 10, startY: 20, nextX: 10, nextY: 27, thresholdPx: 6 })).toBe(true);
  });

  it('keeps right-click drag inactive when movement lands exactly on the threshold radius', () => {
    expect(shouldMarkRightMouseDrag({ startX: 10, startY: 20, nextX: 16, nextY: 20, thresholdPx: 6 })).toBe(false);
  });

  it('suppresses the right-click fallback when the graph callback ran recently', () => {
    expect(shouldUseRightClickFallback({
      now: 1000,
      lastGraphContextEvent: 990,
      lastContainerContextMenuEvent: 0,
      fallbackDelayMs: 40,
    })).toBe(false);
  });

  it('suppresses the right-click fallback when the graph callback is inside the recent window', () => {
    expect(shouldUseRightClickFallback({
      now: 1000,
      lastGraphContextEvent: 900,
      lastContainerContextMenuEvent: 0,
      fallbackDelayMs: 40,
    })).toBe(false);
  });

  it('suppresses the right-click fallback when the graph callback lands on the recent-window boundary', () => {
    expect(shouldUseRightClickFallback({
      now: 1000,
      lastGraphContextEvent: 880,
      lastContainerContextMenuEvent: 0,
      fallbackDelayMs: 40,
    })).toBe(false);
  });

  it('suppresses the right-click fallback when the container context menu ran recently', () => {
    expect(shouldUseRightClickFallback({
      now: 1000,
      lastGraphContextEvent: 0,
      lastContainerContextMenuEvent: 990,
      fallbackDelayMs: 40,
    })).toBe(false);
  });

  it('suppresses the right-click fallback when the container context menu is inside the recent window', () => {
    expect(shouldUseRightClickFallback({
      now: 1000,
      lastGraphContextEvent: 0,
      lastContainerContextMenuEvent: 900,
      fallbackDelayMs: 40,
    })).toBe(false);
  });

  it('suppresses the right-click fallback when the container context menu lands on the recent-window boundary', () => {
    expect(shouldUseRightClickFallback({
      now: 1000,
      lastGraphContextEvent: 0,
      lastContainerContextMenuEvent: 880,
      fallbackDelayMs: 40,
    })).toBe(false);
  });

  it('allows the right-click fallback when both context signals are stale', () => {
    expect(shouldUseRightClickFallback({
      now: 1000,
      lastGraphContextEvent: 500,
      lastContainerContextMenuEvent: 600,
      fallbackDelayMs: 40,
    })).toBe(true);
  });
});
