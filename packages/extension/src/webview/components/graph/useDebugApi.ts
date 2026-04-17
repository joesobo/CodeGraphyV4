import { useEffect, type MutableRefObject, type RefObject } from 'react';
import type { GraphDebugControls } from './debug/types';
import { installGraphDebugApi } from './debug/install';
import type { DebugNode } from './debug/snapshot';

export function useGraphDebugApi({
  containerRef,
  fitView,
  fg2dRef,
  fg3dRef,
  graphDataRef,
  graphMode,
  win,
}: {
  containerRef: RefObject<HTMLElement | null>;
  fitView(this: void): void;
  fg2dRef: MutableRefObject<GraphDebugControls | undefined>;
  fg3dRef: MutableRefObject<GraphDebugControls | undefined>;
  graphDataRef: MutableRefObject<{ nodes: DebugNode[] }>;
  graphMode: '2d' | '3d';
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
      fg3dRef,
      graphDataRef,
      graphMode,
      win,
    });
  }, [containerRef, fg2dRef, fg3dRef, fitView, graphDataRef, graphMode, win]);
}
