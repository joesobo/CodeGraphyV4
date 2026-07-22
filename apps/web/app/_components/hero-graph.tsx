'use client';

import {
  createGraphLayoutEngine,
  prepareGraphPhysics,
  type GraphLayoutEngine,
  type GraphLayoutExternalForce,
  type GraphLayoutInput,
} from '@codegraphy-dev/graph-renderer';
import { useEffect, useRef } from 'react';

const NODE_COUNT = 46;

interface CanvasSize {
  height: number;
  width: number;
}

interface PointerPosition {
  active: boolean;
  x: number;
  y: number;
}

const graphInput = createGraphInput();

export function HeroGraph(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let frame = 0;
    let cleanup = (): void => undefined;

    void prepareGraphPhysics().then(() => {
      if (disposed) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      const layout = createGraphLayoutEngine(graphInput, {
        centralGravity: 0.075,
        chargeDistanceMax: 520,
        chargeStrength: -310,
        collisionPadding: 5,
        initializationSpacing: 22,
        linkDistance: 88,
        linkStrength: 0.42,
        settleSpeed: 0.5,
        velocityDecay: 0.34,
      });
      const pointer: PointerPosition = { active: false, x: 0, y: 0 };
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let canvasSize = resizeCanvas(canvas, context);
      let visible = true;

      const resizeObserver = new ResizeObserver(() => {
        canvasSize = resizeCanvas(canvas, context);
        drawGraph(context, layout, canvasSize);
      });
      resizeObserver.observe(canvas);

      const visibilityObserver = new IntersectionObserver(([entry]) => {
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
        pointer.x = (event.clientX - bounds.left - canvasSize.width / 2) / scale;
        pointer.y = (event.clientY - bounds.top - canvasSize.height / 2) / scale;
        layout.reheat(0.18);
      };
      window.addEventListener('pointermove', updatePointer, { passive: true });

      if (prefersReducedMotion) {
        for (let step = 0; step < 220 && !layout.settled; step += 1) layout.tick();
        drawGraph(context, layout, canvasSize);
      } else {
        const animate = (): void => {
          if (visible) {
            layout.tick(pointer.active ? createPointerForce(layout, pointer) : undefined);
            drawGraph(context, layout, canvasSize);
          }
          frame = window.requestAnimationFrame(animate);
        };
        frame = window.requestAnimationFrame(animate);
      }

      cleanup = (): void => {
        window.cancelAnimationFrame(frame);
        window.removeEventListener('pointermove', updatePointer);
        resizeObserver.disconnect();
        visibilityObserver.disconnect();
      };
    }).catch(() => {
      // The photograph remains complete when WebAssembly is unavailable.
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      cleanup();
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="hero-graph pointer-events-none absolute inset-0 size-full"
      ref={canvasRef}
    />
  );
}

function createGraphInput(): GraphLayoutInput {
  const nodeIds: string[] = Array.from({ length: NODE_COUNT }, (_, index) => `hero-node-${index}`);
  const radii = new Float32Array(NODE_COUNT);
  const chargeStrengthMultipliers = new Float32Array(NODE_COUNT);
  const edgeSources: number[] = [];
  const edgeTargets: number[] = [];

  for (let index = 0; index < NODE_COUNT; index += 1) {
    radii[index] = index % 13 === 0 ? 12 : index % 5 === 0 ? 7 : 4.5;
    chargeStrengthMultipliers[index] = index % 13 === 0 ? 1.5 : 0.78;
    if (index === 0) continue;

    edgeSources.push(Math.floor((index - 1) / 2));
    edgeTargets.push(index);
    if (index > 8 && index % 3 === 0) {
      edgeSources.push(index - 7);
      edgeTargets.push(index);
    }
  }

  return {
    chargeStrengthMultipliers,
    edgeSources: Uint32Array.from(edgeSources),
    edgeTargets: Uint32Array.from(edgeTargets),
    nodeIds,
    radii,
  };
}

function createPointerForce(
  layout: GraphLayoutEngine,
  pointer: PointerPosition,
): GraphLayoutExternalForce {
  return {
    beforeIntegration: alpha => {
      const influenceRadius = 160;
      const influenceRadiusSquared = influenceRadius * influenceRadius;

      for (let index = 0; index < layout.nodeIds.length; index += 1) {
        const dx = layout.x[index] - pointer.x;
        const dy = layout.y[index] - pointer.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= influenceRadiusSquared || distanceSquared < 0.01) continue;

        const distance = Math.sqrt(distanceSquared);
        const strength = (1 - distance / influenceRadius) * 1.15 * alpha;
        layout.vx[index] += (dx / distance) * strength;
        layout.vy[index] += (dy / distance) * strength;
      }
    },
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

function graphScale(size: CanvasSize): number {
  return Math.max(0.72, Math.min(size.width / 820, size.height / 660));
}

function drawGraph(
  context: CanvasRenderingContext2D,
  layout: GraphLayoutEngine,
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
    context.strokeStyle = index % 5 === 0
      ? 'rgba(255, 154, 127, 0.32)'
      : 'rgba(183, 213, 255, 0.24)';
    context.stroke();
  }

  for (let index = 0; index < layout.nodeIds.length; index += 1) {
    const radius = Math.max(2.4, layout.radii[index] * 0.42);
    context.beginPath();
    context.arc(layout.x[index], layout.y[index], radius, 0, Math.PI * 2);
    context.fillStyle = index % 13 === 0
      ? 'rgba(255, 141, 112, 0.88)'
      : index % 5 === 0
        ? 'rgba(115, 169, 255, 0.8)'
        : 'rgba(225, 239, 255, 0.72)';
    context.fill();
  }

  context.restore();
}
