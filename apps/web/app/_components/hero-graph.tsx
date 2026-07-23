'use client';

import {
  createGraphLayoutEngine,
  prepareGraphPhysics,
  type GraphLayoutEngine,
} from '@codegraphy-dev/graph-renderer';
import { useEffect, useRef } from 'react';
import {
  containGraphWithinCanvas,
  createHeroForces,
  graphScale,
  updatePointerPosition,
} from './hero-graph/forces';
import { createGraphData } from './hero-graph/model';
import type {
  CanvasSize,
  HeroGraphData,
  PointerPosition,
} from './hero-graph/types';

const NODE_COLORS = [
  [238, 248, 255],
  [169, 214, 249],
  [213, 235, 255],
  [128, 190, 239],
  [198, 229, 252],
  [151, 204, 245],
] satisfies [number, number, number][];

export function HeroGraph(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return startHeroGraph(canvas);
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="hero-graph pointer-events-none absolute inset-0 size-full"
      ref={canvasRef}
    />
  );
}

function startHeroGraph(canvas: HTMLCanvasElement): () => void {
  const abortController = new AbortController();
  const graphData = createGraphData();
  let disposed = false;
  let frame = 0;
  let resizeObserver: ResizeObserver | undefined;
  let visibilityObserver: IntersectionObserver | undefined;

  void prepareGraphPhysics().then(() => {
    if (disposed) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const layout = createGraphLayoutEngine(graphData.input, {
      alphaDecay: 0.014,
      centralGravity: 0,
      chargeDistanceMax: 240,
      chargeStrength: -138,
      collisionPadding: 3.5,
      initializationSpacing: 12,
      linkDistance: 24,
      linkStrength: 2,
      settleSpeed: 0.5,
      velocityDecay: 0.31,
    });
    layout.setAlphaTarget(0.014);
    let canvasSize = resizeCanvas(canvas, context);
    const pointer: PointerPosition = {
      active: false,
      currentX: 0,
      currentY: 0,
      targetX: 0,
      targetY: 0,
    };
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const heroForces = createHeroForces(
      layout,
      graphData.orbitSpeedMultipliers,
      (): CanvasSize => canvasSize,
    );
    let visible = true;

    resizeObserver = new ResizeObserver(() => {
      canvasSize = resizeCanvas(canvas, context);
      containGraphWithinCanvas(layout, canvasSize);
      drawGraph(context, layout, graphData, pointer, canvasSize);
    });
    resizeObserver.observe(canvas);

    visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
    });
    visibilityObserver.observe(canvas);

    const updatePointer = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse') return;
      const bounds = canvas.getBoundingClientRect();
      pointer.active = event.clientX >= bounds.left
        && event.clientX <= bounds.right
        && event.clientY >= bounds.top
        && event.clientY <= bounds.bottom;
      if (!pointer.active) return;

      const scale = graphScale(canvasSize);
      pointer.targetX = (event.clientX - bounds.left - canvasSize.width / 2) / scale;
      pointer.targetY = (event.clientY - bounds.top - canvasSize.height / 2) / scale;
    };
    window.addEventListener('pointermove', updatePointer, {
      passive: true,
      signal: abortController.signal,
    });

    if (prefersReducedMotion) {
      for (let step = 0; step < 220 && !layout.settled; step += 1) layout.tick();
      containGraphWithinCanvas(layout, canvasSize);
      drawGraph(context, layout, graphData, pointer, canvasSize);
      return;
    }

    const animate = (): void => {
      if (visible) {
        updatePointerPosition(pointer);
        layout.tick(heroForces);
        drawGraph(context, layout, graphData, pointer, canvasSize);
      }
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
  }).catch(() => {
    // The photograph remains complete when WebAssembly is unavailable.
  });

  return () => {
    disposed = true;
    abortController.abort();
    window.cancelAnimationFrame(frame);
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
  };
}

function resizeCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
): CanvasSize {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return { height, width };
}

function drawGraph(
  context: CanvasRenderingContext2D,
  layout: GraphLayoutEngine,
  graphData: HeroGraphData,
  pointer: PointerPosition,
  size: CanvasSize,
): void {
  const scale = graphScale(size);
  context.clearRect(0, 0, size.width, size.height);
  context.save();
  context.translate(size.width / 2, size.height / 2);
  context.scale(scale, scale);

  context.lineCap = 'round';
  context.lineWidth = 0.85 / scale;
  for (let index = 0; index < layout.edgeSources.length; index += 1) {
    const source = layout.edgeSources[index];
    const target = layout.edgeTargets[index];
    context.beginPath();
    context.moveTo(layout.x[source], layout.y[source]);
    context.lineTo(layout.x[target], layout.y[target]);
    context.strokeStyle = graphData.nodeGroups[source] === graphData.nodeGroups[target]
      ? 'rgba(224, 240, 255, 0.34)'
      : 'rgba(194, 223, 248, 0.24)';
    context.stroke();
  }

  for (let index = 0; index < layout.nodeIds.length; index += 1) {
    const baseRadius = Math.max(4.5, layout.radii[index] * 0.78) / scale;
    const pointerDistance = Math.hypot(
      layout.x[index] - pointer.currentX,
      layout.y[index] - pointer.currentY,
    );
    const hoverRadius = baseRadius + 30 / scale;
    const hoverInfluence = pointer.active
      ? Math.max(0, 1 - pointerDistance / hoverRadius)
      : 0;
    const targetScale = 1 + hoverInfluence * 0.22;
    graphData.nodeHoverScales[index] += (
      targetScale - graphData.nodeHoverScales[index]
    ) * 0.18;
    const radius = baseRadius * graphData.nodeHoverScales[index];

    context.save();
    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = 'rgb(0 0 0)';
    context.beginPath();
    context.arc(layout.x[index], layout.y[index], radius + 1.25 / scale, 0, Math.PI * 2);
    context.fill();
    context.restore();

    context.beginPath();
    context.arc(layout.x[index], layout.y[index], radius, 0, Math.PI * 2);
    context.fillStyle = nodeFill(
      graphData.nodeGroups[index],
      graphData.nodeOpacities[index],
    );
    context.fill();
  }

  context.restore();
}

function nodeFill(group: number, opacity: number): string {
  const [red, green, blue] = NODE_COLORS[group % NODE_COLORS.length];
  return `rgba(${red}, ${green}, ${blue}, ${opacity.toFixed(2)})`;
}
