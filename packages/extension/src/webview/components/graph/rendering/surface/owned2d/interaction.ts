import type { Dispatch, MouseEvent as ReactMouseEvent, MutableRefObject, PointerEvent as ReactPointerEvent, SetStateAction, WheelEvent as ReactWheelEvent } from 'react';
import type { FGLink, FGNode } from '../../../model/build';
import type { OwnedGraphCamera } from './camera';
import type { Surface2dProps } from './contracts';
import type { OwnedGraphLayout } from './layout';
import type { OwnedGraphLinkPicker } from './linkPicking';
import type { OwnedGraphNodeHover } from './nodeHover';
import type { OwnedGraphNodePicker } from './picking';
import { cancelPointerSession, completePointerSession } from './interactionEnd';
import { movePointerSession } from './interactionMove';
import { beginPointerSession } from './interactionStart';
import { leavePointerSurface, suppressNativeContextMenu, zoomAtPointer } from './interactionSurface';

export interface ContextGestureSession { button: 0 | 2; moved: boolean; pointerId: number; startScreen: { x: number; y: number } }
export interface PointerSession { draggedIndexes: Set<number>; index: number | null; node: FGNode | null; nodeId: string | null; link: FGLink | null; lastWorld: { x: number; y: number }; moved: boolean; startScreen: { x: number; y: number } }
export interface LinkTooltip { link: FGLink; screen: { x: number; y: number } }

export interface OwnedGraphInteractionRuntime {
  cameraRef: MutableRefObject<OwnedGraphCamera>; clearLinkHover(this: void): boolean;
  contextGestureSessionRef: MutableRefObject<ContextGestureSession | null>;
  engineStopNotifiedRef: MutableRefObject<boolean>; hoveredLinkRef: MutableRefObject<FGLink | null>;
  hoveredNodeRef: MutableRefObject<FGNode | null>; layoutRef: MutableRefObject<OwnedGraphLayout | null>;
  linkPickerPositionVersionRef: MutableRefObject<number>; linkPickerRef: MutableRefObject<OwnedGraphLinkPicker>;
  nodeHoverRef: MutableRefObject<OwnedGraphNodeHover>; pickerPositionVersionRef: MutableRefObject<number>;
  pickerRef: MutableRefObject<OwnedGraphNodePicker>; pointerSessionRef: MutableRefObject<PointerSession | null>;
  positionVersionRef: MutableRefObject<number>; propsRef: MutableRefObject<Surface2dProps>;
  requestFrameRef: MutableRefObject<() => void>; setLinkTooltip: Dispatch<SetStateAction<LinkTooltip | null>>;
  synchronizedPositionVersionRef: MutableRefObject<number>;
}

export interface OwnedGraphInteractionHandlers {
  handleContextMenu(this: void, event: ReactMouseEvent<HTMLCanvasElement>): void;
  handlePointerCancel(this: void, event: ReactPointerEvent<HTMLCanvasElement>): void;
  handlePointerDown(this: void, event: ReactPointerEvent<HTMLCanvasElement>): void;
  handlePointerLeave(this: void): void;
  handlePointerMove(this: void, event: ReactPointerEvent<HTMLCanvasElement>): void;
  handlePointerUp(this: void, event: ReactPointerEvent<HTMLCanvasElement>): void;
  handleWheel(this: void, event: ReactWheelEvent<HTMLCanvasElement>): void;
}

export function createOwnedGraphInteractionHandlers(runtime: OwnedGraphInteractionRuntime): OwnedGraphInteractionHandlers {
  return {
    handleContextMenu: suppressNativeContextMenu,
    handlePointerCancel: event => cancelPointerSession(runtime, event),
    handlePointerDown: event => beginPointerSession(runtime, event),
    handlePointerLeave: () => leavePointerSurface(runtime),
    handlePointerMove: event => movePointerSession(runtime, event),
    handlePointerUp: event => completePointerSession(runtime, event),
    handleWheel: event => zoomAtPointer(runtime, event),
  };
}
