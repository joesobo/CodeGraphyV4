import type { ReactElement, RefObject } from 'react';

export const OWNED_GRAPH_MINIMAP_SIZE = 160;

interface OwnedGraphMinimapProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  overlayRef: RefObject<SVGSVGElement>;
  panelRef: RefObject<HTMLDivElement>;
}

export function OwnedGraphMinimap({
  canvasRef,
  overlayRef,
  panelRef,
}: OwnedGraphMinimapProps): ReactElement {
  return (
    <div
      ref={panelRef}
      aria-label="Relationship Graph minimap"
      className="absolute bottom-3 left-3 z-20 h-40 w-40 overflow-hidden rounded-sm border border-border bg-background shadow-md"
      data-testid="graph-minimap"
      role="group"
    >
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
      />
    </div>
  );
}
