import { useEffect, type MutableRefObject, type RefObject } from 'react';
import type { GraphDebugControls } from './contracts/protocol';
import { installGraphDebugApi } from './install';
import type { DebugNode } from './snapshot';

export function useGraphDebugApi({
  containerRef,
  fitView,
  fg2dRef,
  graphDataRef,
  openNodeContextMenu,
  win,
}: {
  containerRef: RefObject<HTMLElement | null>;
  fitView(this: void): void;
  fg2dRef: MutableRefObject<GraphDebugControls | undefined>;
  graphDataRef: MutableRefObject<{ nodes: DebugNode[] }>;
  openNodeContextMenu?(this: void, nodeId: string, event: MouseEvent): void;
  win?: Window;
}): void {
  useEffect(() => {
    if (!win) {
      return;
    }

    return installGraphDebugApi({
      containerRef,
      fitView,
      fg2dRef,
      graphDataRef,
      openNodeContextMenu,
      win,
    });
  }, [containerRef, fg2dRef, fitView, graphDataRef, openNodeContextMenu, win]);
}
