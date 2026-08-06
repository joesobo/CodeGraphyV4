import {
  createGraphLayoutEngine,
  prepareGraphPhysics,
  WebGpuGraphRenderer,
  type GraphRendererLink,
  type GraphRendererNode,
  type GraphRendererNodeStyle,
} from '@codegraphy-dev/graph-renderer';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DesktopGraph, DesktopGraphNode } from '../model';

function nodeStyle(node: DesktopGraphNode, selectedId: string | undefined): GraphRendererNodeStyle {
  const symbol = Boolean(node.symbol);
  const selected = node.id === selectedId;
  const folder = node.nodeType === 'folder';
  const size = selected ? (symbol ? 13 : 18) : (symbol ? 7 : 11);
  return {
    borderColor: selected ? '#f3fbff' : (symbol ? '#bb9cff' : '#a6e7d7'),
    borderWidth: selected ? 2 : 1,
    cornerRadius: folder ? 2 : 6,
    fillColor: selected ? '#55d9b8' : (symbol ? '#7758b8' : folder ? '#c59555' : '#197c84'),
    fillOpacity: 1,
    height: folder ? size * 0.72 : size,
    opacity: 1,
    shape: folder ? 'rectangle' : symbol ? 'diamond' : 'circle',
    width: folder ? size * 1.35 : size,
  };
}

function fitCamera(x: Float32Array, y: Float32Array, width: number, height: number) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < x.length; index += 1) {
    const nodeX = x[index];
    const nodeY = y[index];
    if (nodeX === undefined || nodeY === undefined) continue;
    minX = Math.min(minX, nodeX);
    maxX = Math.max(maxX, nodeX);
    minY = Math.min(minY, nodeY);
    maxY = Math.max(maxY, nodeY);
  }
  if (!Number.isFinite(minX)) return { centerX: 0, centerY: 0, zoom: 1 };
  const zoom = Math.max(0.08, Math.min(2.2, Math.min(
    width / Math.max(120, maxX - minX + 100),
    height / Math.max(120, maxY - minY + 100),
  )));
  return { centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2, zoom };
}

export function GraphPanel({
  graph,
  selectedId,
  onSelect,
}: {
  graph: DesktopGraph;
  selectedId?: string;
  onSelect: (id: string) => void;
}): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedIdRef = useRef(selectedId);
  const redrawRef = useRef<(() => void) | undefined>(undefined);
  const [physicsReady, setPhysicsReady] = useState(false);
  const [rendererError, setRendererError] = useState<string>();

  const relationships = useMemo(() => graph.edges.filter(
    edge => edge.from === selectedId || edge.to === selectedId,
  ).slice(0, 8), [graph.edges, selectedId]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    redrawRef.current?.();
  }, [selectedId]);

  useEffect(() => {
    let active = true;
    void prepareGraphPhysics()
      .then(() => { if (active) setPhysicsReady(true); })
      .catch(error => {
        if (active) setRendererError(error instanceof Error ? error.message : String(error));
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || graph.nodes.length === 0 || !physicsReady) return;
    let active = true;
    let animationFrame: number | undefined;
    let framePending = false;
    let continueAfterFrame = false;
    let renderer: WebGpuGraphRenderer | undefined;
    let fitFrames = 90;
    let positionVersion = 0;
    let styleVersion = 0;
    let camera = { centerX: 0, centerY: 0, zoom: 1 };
    let pointer: { x: number; y: number } | undefined;

    const nodes: GraphRendererNode[] = graph.nodes.map(node => ({ id: node.id }));
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const sourceIndexes: number[] = [];
    const targetIndexes: number[] = [];
    const links: GraphRendererLink[] = [];
    const indexById = new Map(nodes.map((node, index) => [node.id, index]));
    for (const edge of graph.edges) {
      const sourceIndex = indexById.get(edge.from);
      const targetIndex = indexById.get(edge.to);
      const source = nodeById.get(edge.from);
      const target = nodeById.get(edge.to);
      if (sourceIndex === undefined || targetIndex === undefined || !source || !target) continue;
      sourceIndexes.push(sourceIndex);
      targetIndexes.push(targetIndex);
      links.push({ source, target });
    }
    const layout = createGraphLayoutEngine({
      nodeIds: nodes.map(node => node.id),
      radii: Float32Array.from(graph.nodes.map(node => node.symbol ? 4 : 7)),
      chargeStrengthMultipliers: Float32Array.from(graph.nodes.map(node => node.symbol ? 0.75 : 1.2)),
      edgeSources: Uint32Array.from(sourceIndexes),
      edgeTargets: Uint32Array.from(targetIndexes),
    }, {
      chargeStrength: -85,
      collisionPadding: 3,
      initializationSpacing: 26,
      linkDistance: 42,
      linkStrength: 0.45,
      settleSpeed: 0.05,
      settleSteps: 36,
    });

    const schedule = (): void => {
      if (!active || framePending) return;
      framePending = true;
      animationFrame = requestAnimationFrame(() => {
        framePending = false;
        draw();
      });
    };
    const getNodeStyle = (node: GraphRendererNode): GraphRendererNodeStyle => {
      const index = indexById.get(node.id);
      const source = index === undefined ? undefined : graph.nodes[index];
      return source
        ? nodeStyle(source, selectedIdRef.current)
        : nodeStyle({ id: node.id, label: node.id }, selectedIdRef.current);
    };
    const draw = (): void => {
      if (!renderer?.canRender() || !active) return;
      const tick = layout.tick();
      continueAfterFrame = !tick.settled;
      if (tick.steps > 0) positionVersion += 1;
      for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        if (!node) continue;
        node.x = layout.x[index];
        node.y = layout.y[index];
      }
      if (fitFrames > 0) {
        camera = fitCamera(layout.x, layout.y, canvas.clientWidth, canvas.clientHeight);
        fitFrames -= 1;
      }
      renderer.render({
        backgroundColor: '#09151b',
        camera,
        cssHeight: Math.max(1, canvas.clientHeight),
        cssWidth: Math.max(1, canvas.clientWidth),
        devicePixelRatio: window.devicePixelRatio,
        directionMode: 'arrows',
        edgeSources: layout.edgeSources,
        edgeTargets: layout.edgeTargets,
        getArrowColor: () => '#6fa9b3',
        getLinkColor: () => '#345861',
        getLinkOpacity: () => 0.7,
        getLinkWidth: () => 0.8,
        getNodeStyle,
        hoveredLink: null,
        hoveredNodeIndex: -1,
        hoveredNodeScale: 1,
        links,
        nodes,
        nodeX: layout.x,
        nodeY: layout.y,
        positionVersion,
        styleVersion,
      });
    };
    const redraw = (): void => {
      styleVersion += 1;
      schedule();
    };
    redrawRef.current = redraw;
    const resize = new ResizeObserver(redraw);
    resize.observe(canvas);
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      fitFrames = 0;
      camera.zoom = Math.max(0.05, Math.min(5, camera.zoom * Math.exp(-event.deltaY * 0.001)));
      redraw();
    };
    const onPointerDown = (event: PointerEvent): void => {
      pointer = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      fitFrames = 0;
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (!pointer) return;
      camera.centerX -= (event.clientX - pointer.x) / camera.zoom;
      camera.centerY -= (event.clientY - pointer.y) / camera.zoom;
      pointer = { x: event.clientX, y: event.clientY };
      redraw();
    };
    const onPointerUp = (): void => { pointer = undefined; };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    void WebGpuGraphRenderer.create(canvas, {
        onDeviceLost: message => setRendererError(`WebGPU device lost: ${message}`),
        onFrameComplete: () => { if (continueAfterFrame) schedule(); },
        onFrameRejected: () => { if (continueAfterFrame) schedule(); },
        onRendererError: setRendererError,
      })
      .then((created) => {
        if (!active) {
          created?.dispose();
          return;
        }
        renderer = created;
        if (!renderer) setRendererError('WebGPU is unavailable in this macOS webview.');
        else schedule();
      })
      .catch(error => setRendererError(error instanceof Error ? error.message : String(error)));

    return () => {
      active = false;
      redrawRef.current = undefined;
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      resize.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      renderer?.dispose();
      layout.pause();
    };
  }, [graph, physicsReady]);

  return (
    <section className="graph-panel">
      <div className="graph-canvas-wrap">
        <canvas aria-label="Relationship Graph" className="graph-canvas" ref={canvasRef} />
        {rendererError ? <div className="graph-error">{rendererError}</div> : null}
        <div className="graph-legend">
          <span><i className="legend-file" />Files</span>
          <span><i className="legend-symbol" />Symbols</span>
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
                const targetFile = targetNode?.symbol?.filePath ?? target;
                return (
                  <button key={edge.id} onClick={() => onSelect(targetFile)} type="button">
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
