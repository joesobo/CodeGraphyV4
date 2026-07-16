import type { ReactElement, RefObject } from 'react';
import type { MinimapViewport } from './viewport';
import type { MinimapInteractionHandlers } from './interaction';
import {
  OWNED_GRAPH_MINIMAP_LEFT_INSET,
  OWNED_GRAPH_MINIMAP_SIZE,
} from './layout';

export { OWNED_GRAPH_MINIMAP_SIZE } from './layout';

const MINIMAP_INSTRUCTIONS_ID = 'relationship-graph-minimap-instructions';

interface OwnedGraphMinimapProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  enabled: boolean;
  overlayRef: RefObject<SVGSVGElement>;
  panelRef: RefObject<HTMLDivElement>;
  viewportBoxRef: RefObject<SVGRectElement>;
  directionIndicatorRef: RefObject<SVGPathElement>;
  interactionHandlers?: MinimapInteractionHandlers;
}

export function OwnedGraphMinimap({
  canvasRef,
  enabled,
  overlayRef,
  panelRef,
  viewportBoxRef,
  directionIndicatorRef,
  interactionHandlers,
}: OwnedGraphMinimapProps): ReactElement | null {
  if (!enabled) return null;
  return (
    <div
      ref={panelRef}
      aria-describedby={MINIMAP_INSTRUCTIONS_ID}
      aria-label="Relationship Graph minimap"
      className="absolute bottom-3 z-20 h-40 w-40 cursor-grab overflow-hidden rounded-sm border border-border bg-background shadow-md active:cursor-grabbing"
      data-testid="graph-minimap"
      onContextMenu={interactionHandlers?.onContextMenu}
      onKeyDown={interactionHandlers?.onKeyDown}
      onLostPointerCapture={interactionHandlers?.onLostPointerCapture}
      onPointerCancel={interactionHandlers?.onPointerCancel}
      onPointerDown={interactionHandlers?.onPointerDown}
      onPointerMove={interactionHandlers?.onPointerMove}
      onPointerUp={interactionHandlers?.onPointerUp}
      onWheel={interactionHandlers?.onWheel}
      role="group"
      style={{ left: OWNED_GRAPH_MINIMAP_LEFT_INSET, touchAction: 'none' }}
      tabIndex={0}
    >
      <span className="sr-only" id={MINIMAP_INSTRUCTIONS_ID}>
        Drag to pan the graph. Use the arrow keys to pan with the keyboard.
      </span>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      />
      <svg
        ref={overlayRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${OWNED_GRAPH_MINIMAP_SIZE} ${OWNED_GRAPH_MINIMAP_SIZE}`}
      >
        <rect
          ref={viewportBoxRef}
          data-testid="graph-minimap-viewport"
          fill="var(--cg-primary-faint)"
          stroke="var(--cg-primary)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <path
          ref={directionIndicatorRef}
          d="M 5 0 L -4 4 L -4 -4 Z"
          data-testid="graph-minimap-direction"
          display="none"
          fill="var(--cg-primary)"
        />
      </svg>
    </div>
  );
}

export function updateOwnedGraphMinimapOverlay(
  viewportBox: SVGRectElement,
  directionIndicator: SVGPathElement,
  viewport: MinimapViewport,
): void {
  if (viewport.box) {
    viewportBox.removeAttribute('display');
    viewportBox.setAttribute('x', String(viewport.box.x));
    viewportBox.setAttribute('y', String(viewport.box.y));
    viewportBox.setAttribute('width', String(viewport.box.width));
    viewportBox.setAttribute('height', String(viewport.box.height));
  } else {
    viewportBox.setAttribute('display', 'none');
  }
  if (viewport.indicator) {
    const angleDegrees = viewport.indicator.angle * 180 / Math.PI;
    directionIndicator.removeAttribute('display');
    directionIndicator.setAttribute(
      'transform',
      `translate(${viewport.indicator.x} ${viewport.indicator.y}) rotate(${angleDegrees})`,
    );
  } else {
    directionIndicator.setAttribute('display', 'none');
  }
}
