import type {
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
} from 'react';
import type { FGNode } from '../../../../model/build';
import {
  isMarqueePastThreshold,
  type GraphMarqueeSelectionState,
  type MarqueePoint,
} from '../../../../marqueeSelection/model';
import type { GraphRuntime } from '../../state';
import type { GraphInteractionHandlersRuntime } from '../contracts';

const MARQUEE_DRAG_THRESHOLD_PX = 6;
const MARQUEE_IGNORE_SELECTOR = '[data-graph-marquee-ignore="true"]';

export interface MarqueeDragState {
  additive: boolean;
  current: MarqueePoint;
  selecting: boolean;
  start: MarqueePoint;
}

export interface GraphMarqueeSelectionRuntimeOptions {
  containerRef: GraphRuntime['renderer']['containerRef'];
  fg2dRef: GraphRuntime['renderer']['fg2dRef'];
  graphDataRef: GraphRuntime['renderer']['graphDataRef'];
  hoveredNodeRef: MutableRefObject<FGNode | null>;
  interactionHandlers: GraphInteractionHandlersRuntime;
  selectedNodesSetRef: GraphRuntime['selection']['selectedNodeIdsRef'];
}

export interface GraphMarqueeSelectionRuntime {
  clearMarqueeSelection(this: void): void;
  handleMouseDownCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleMouseMoveCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  handleMouseUpCapture(this: void, event: ReactMouseEvent<HTMLDivElement>): void;
  marqueeSelection: GraphMarqueeSelectionState | null;
}

export function canStartMarqueeSelection(
  event: ReactMouseEvent<HTMLDivElement>,
  hoveredNode: FGNode | null,
): boolean {
  return event.button === 0
    && !event.ctrlKey
    && !hoveredNode
    && !isIgnoredMarqueeTarget(event.target);
}

function isIgnoredMarqueeTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest(MARQUEE_IGNORE_SELECTOR);
}

export function createMarqueeDragState(
  point: MarqueePoint,
  additive: boolean,
): MarqueeDragState {
  return {
    additive,
    current: point,
    selecting: false,
    start: point,
  };
}

export function updateMarqueeDragState(
  drag: MarqueeDragState,
  current: MarqueePoint,
): void {
  drag.current = current;
  if (!drag.selecting) {
    drag.selecting = isMarqueePastThreshold(
      drag.start,
      current,
      MARQUEE_DRAG_THRESHOLD_PX,
    );
  }
}

export function getLocalMarqueePoint(
  event: ReactMouseEvent<HTMLDivElement>,
  container: HTMLDivElement | null,
): MarqueePoint {
  const rect = container?.getBoundingClientRect();

  return {
    x: event.clientX - (rect?.left ?? 0),
    y: event.clientY - (rect?.top ?? 0),
  };
}
