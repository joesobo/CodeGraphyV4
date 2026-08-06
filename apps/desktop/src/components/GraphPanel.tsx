import type { GraphPhysicsSettings } from '@codegraphy-dev/graph-visuals';
import { useMemo } from 'react';
import type { DesktopGraph } from '../model';
import { useDesktopGraphRenderer } from '../useDesktopGraphRenderer';

export function GraphPanel({
  graph,
  physicsSettings,
  selectedId,
  onSelect,
  revision,
}: {
  graph: DesktopGraph;
  physicsSettings: GraphPhysicsSettings;
  selectedId?: string;
  onSelect: (id: string) => void;
  revision: number;
}): React.ReactElement {
  const { canvasRef, overlayRef, rendererError } = useDesktopGraphRenderer({
    graph,
    onSelect,
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
        <div className="graph-legend">
          <span><i className="legend-file" />Files</span>
          <span><i className="legend-folder" />Folders</span>
        </div>
      </div>
      <div className="relationship-inspector">
        <div className="inspector-heading">
          <span>{selectedId ? 'Relationships' : 'Graph summary'}</span>
          <span>{graph.nodes.length} Nodes · {graph.edges.length} Relationships</span>
        </div>
        {selectedId ? (
          <>
            <strong className="selected-node-title">{selectedId}</strong>
            <div className="relationship-list">
              {relationships.length === 0 ? <span className="quiet">No visible Relationships</span> : relationships.map(edge => {
                const outgoing = edge.from === selectedId;
                const target = outgoing ? edge.to : edge.from;
                const targetNode = graph.nodes.find(node => node.id === target);
                const targetIsFile = targetNode?.nodeType !== 'folder';
                return (
                  <button
                    disabled={!targetIsFile}
                    key={edge.id}
                    onClick={() => onSelect(target)}
                    title={targetIsFile ? `Open ${target}` : `${target} is a Folder`}
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
        ) : <p className="quiet">Choose a File to inspect its incoming and outgoing Relationships.</p>}
      </div>
    </section>
  );
}
