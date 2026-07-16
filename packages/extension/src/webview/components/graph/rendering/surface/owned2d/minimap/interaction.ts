import type {
  KeyboardEvent as ReactKeyboardEvent,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  SyntheticEvent,
  WheelEvent as ReactWheelEvent,
} from 'react';
import type { OwnedGraphCamera } from '../camera/runtime/model';
import {
  handleMinimapPointerDown,
  handleMinimapPointerMove,
} from './drag';
import {
  handleMinimapKeyDown,
  handleMinimapLostPointerCapture,
  handleMinimapPointerCancel,
  handleMinimapPointerUp,
  suppressMinimapEvent,
} from './events';
import type { MinimapNavigationSession } from './navigation';
import type { MinimapProjection } from './projection';

export interface MinimapInteractionRuntime {
  cameraRef: MutableRefObject<OwnedGraphCamera>;
  mainCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  projectionRef: MutableRefObject<MinimapProjection | null>;
  sessionRef: MutableRefObject<MinimapNavigationSession | null>;
  clearHover(this: void): void;
  requestFrame(this: void): void;
}

export interface MinimapInteractionHandlers {
  onContextMenu(this: void, event: SyntheticEvent<HTMLDivElement>): void;
  onKeyDown(this: void, event: ReactKeyboardEvent<HTMLDivElement>): void;
  onLostPointerCapture(this: void, event: ReactPointerEvent<HTMLDivElement>): void;
  onPointerCancel(this: void, event: ReactPointerEvent<HTMLDivElement>): void;
  onPointerDown(this: void, event: ReactPointerEvent<HTMLDivElement>): void;
  onPointerMove(this: void, event: ReactPointerEvent<HTMLDivElement>): void;
  onPointerUp(this: void, event: ReactPointerEvent<HTMLDivElement>): void;
  onWheel(this: void, event: ReactWheelEvent<HTMLDivElement>): void;
}

export function createMinimapInteractionHandlers(
  runtime: MinimapInteractionRuntime,
): MinimapInteractionHandlers {
  return {
    onContextMenu: suppressMinimapEvent,
    onKeyDown: event => handleMinimapKeyDown(runtime, event),
    onLostPointerCapture: event => handleMinimapLostPointerCapture(runtime, event),
    onPointerCancel: event => handleMinimapPointerCancel(runtime, event),
    onPointerDown: event => handleMinimapPointerDown(runtime, event),
    onPointerMove: event => handleMinimapPointerMove(runtime, event),
    onPointerUp: event => handleMinimapPointerUp(runtime, event),
    onWheel: suppressMinimapEvent,
  };
}
