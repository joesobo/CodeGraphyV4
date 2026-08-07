import type { GraphPhysicsSettings } from '@codegraphy-dev/graph-renderer/visuals';
import { useMemo } from 'react';
import type { DesktopGraph } from '../model';
import { useDesktopGraphRenderer } from '../useDesktopGraphRenderer';

export function GraphPanel({
  graph,
  physicsSettings,
  selectedId,
  onSelectionChange,
  revision,
}: {
  graph: DesktopGraph;
  physicsSettings: GraphPhysicsSettings;
  selectedId?: string;
  onSelectionChange: (id: string | undefined) => void;
  revision: number;
}): React.ReactElement {
  const {
    canvasRef,
    fitToScreen,
    overlayRef,
    rendererError,
    zoomIn,
    zoomOut,
  } = useDesktopGraphRenderer({
    graph,
    onSelectionChange,
    physicsSettings,
    selectedId,
  });
  const relationships = useMemo(() => graph.edges.filter(
    edge => edge.from === selectedId || edge.to === selectedId,
  ).slice(0, 8), [graph.edges, selectedId]);

  return (
    <section className="graph-panel">
      <div className="graph-canvas-wrap">
        <canvas
          aria-label="Relationship Graph. Use arrow keys to pan, plus or minus to zoom, and zero to fit."
          className="graph-canvas"
          key={`graph-${revision}`}
          ref={canvasRef}
          tabIndex={0}
        />
        <canvas
          aria-hidden="true"
          className="graph-canvas-overlay"
          key={`overlay-${revision}`}
          ref={overlayRef}
        />
        {rendererError ? <div className="graph-error">{rendererError}</div> : null}
        <div aria-label="Graph viewport controls" className="graph-viewport-controls" role="toolbar">
          <button aria-label="Zoom In" onClick={zoomIn} title="Zoom In" type="button">+</button>
          <button aria-label="Zoom Out" onClick={zoomOut} title="Zoom Out" type="button">−</button>
          <button aria-label="Fit to Screen" onClick={fitToScreen} title="Fit to Screen" type="button">
            <span aria-hidden="true" className="fit-screen-icon">⌗</span>
          </button>
        </div>
      </div>
      <div className="relationship-inspector">
        <div className="inspector-heading">
          <span>{selectedId ? 'Relationships' : 'Graph summary'}</span>
        </div>
        {selectedId ? (
          <>
            <strong className="selected-node-title">{selectedId}</strong>
            <div className="relationship-list">
              {relationships.length === 0 ? <span className="quiet">No visible Relationships</span> : relationships.map(edge => {
                const outgoing = edge.from === selectedId;
                const target = outgoing ? edge.to : edge.from;
                return (
                  <button
                    key={edge.id}
                    onClick={() => onSelectionChange(target)}
                    title={`Select ${target}`}
                    type="button"
                  >
                    <span className="relationship-kind">{edge.kind}</span>
                    <span className="relationship-direction">{outgoing ? '→' : '←'}</span>
                    <span>{target}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : <p className="quiet">Choose a Node to inspect its incoming and outgoing Relationships.</p>}
      </div>
    </section>
  );
}
