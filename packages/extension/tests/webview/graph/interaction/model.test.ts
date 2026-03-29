import { describe, expect, it } from 'vitest';
import {
  getBackgroundClickCommand,
  getLinkClickCommand,
  getNodeClickCommand,
  getNodeContextMenuSelection,
  shouldMarkRightMouseDrag,
  shouldUseRightClickFallback,
} from '../../../../src/webview/components/graph/interaction/model';

describe('graph/interaction/model barrel', () => {
  it('re-exports the public graph interaction helpers', () => {
    expect(getNodeContextMenuSelection('src/app.ts', [])).toEqual({
      nodeIds: ['src/app.ts'],
      shouldUpdateSelection: true,
    });
    expect(
      getNodeClickCommand({
        nodeId: 'src/app.ts',
        label: 'app.ts',
        ctrlKey: true,
        shiftKey: false,
        metaKey: false,
        clientX: 0,
        clientY: 0,
        isMacPlatform: true,
        selectedNodeIds: [],
        lastClick: null,
        now: 100,
        doubleClickThresholdMs: 450,
      }),
    ).toEqual({
      nextLastClick: null,
      effects: [{ kind: 'openNodeContextMenu', nodeId: 'src/app.ts' }],
    });
    expect(getBackgroundClickCommand({ ctrlKey: true, isMacPlatform: true })).toEqual([
      { kind: 'openBackgroundContextMenu' },
    ]);
    expect(getLinkClickCommand({ ctrlKey: false, isMacPlatform: false })).toEqual([]);
    expect(
      shouldMarkRightMouseDrag({
        startX: 10,
        startY: 20,
        nextX: 20,
        nextY: 30,
        thresholdPx: 6,
      }),
    ).toBe(true);
    expect(
      shouldUseRightClickFallback({
        now: 1000,
        lastGraphContextEvent: 500,
        lastContainerContextMenuEvent: 600,
        fallbackDelayMs: 40,
      }),
    ).toBe(true);
  });
});
