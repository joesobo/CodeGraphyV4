'use client';

import {
  createGraphLayoutEngine,
  prepareGraphPhysics,
  type GraphLayoutEngine,
  type GraphLayoutExternalForce,
  type GraphLayoutInput,
} from '@codegraphy-dev/graph-renderer';
import { useEffect, useRef } from 'react';

const COMMUNITY_COUNT = 5;
const NODE_COUNT = 72;
const RANDOM_SEED = 0xc0de_6a7;

interface CanvasSize {
  height: number;
  width: number;
}

interface PointerPosition {
  active: boolean;
  x: number;
  y: number;
}

interface HeroGraphData {
  input: GraphLayoutInput;
  nodeGroups: Uint8Array;
}

const graphData = createGraphData();

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
  let disposed = false;
  let frame = 0;
  let resizeObserver: ResizeObserver | undefined;
  let visibilityObserver: IntersectionObserver | undefined;

  void prepareGraphPhysics().then(() => {
    if (disposed) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const layout = createGraphLayoutEngine(graphData.input, {
      centralGravity: 0.046,
      chargeDistanceMax: 250,
      chargeStrength: -175,
      collisionPadding: 6,
      initializationSpacing: 14,
      linkDistance: 36,
      linkStrength: 0.84,
      settleSpeed: 0.5,
      velocityDecay: 0.29,
    });
    const pointer: PointerPosition = { active: false, x: 0, y: 0 };
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let canvasSize = resizeCanvas(canvas, context);
    let visible = true;

    resizeObserver = new ResizeObserver(() => {
      canvasSize = resizeCanvas(canvas, context);
      drawGraph(context, layout, graphData.nodeGroups, canvasSize);
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
      pointer.x = (event.clientX - bounds.left - canvasSize.width / 2) / scale;
      pointer.y = (event.clientY - bounds.top - canvasSize.height / 2) / scale;
      layout.reheat(0.24);
    };
    window.addEventListener('pointermove', updatePointer, {
      passive: true,
      signal: abortController.signal,
    });

    if (prefersReducedMotion) {
      for (let step = 0; step < 220 && !layout.settled; step += 1) layout.tick();
      drawGraph(context, layout, graphData.nodeGroups, canvasSize);
      return;
    }

    const animate = (): void => {
      if (visible) {
        layout.tick(pointer.active ? createPointerForce(layout, pointer) : undefined);
        drawGraph(context, layout, graphData.nodeGroups, canvasSize);
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

function createGraphData(): HeroGraphData {
  const random = createSeededRandom(RANDOM_SEED);
  const nodeIds: string[] = Array.from({ length: NODE_COUNT }, (_, index) => `hero-node-${index}`);
  const radii = new Float32Array(NODE_COUNT);
  const chargeStrengthMultipliers = new Float32Array(NODE_COUNT);
  const initialX = new Float32Array(NODE_COUNT);
  const initialY = new Float32Array(NODE_COUNT);
  const nodeGroups = new Uint8Array(NODE_COUNT);
  const edgeSources: number[] = [];
  const edgeTargets: number[] = [];
  const membersByCommunity: number[][] = Array.from(
    { length: COMMUNITY_COUNT },
    (): number[] => [],
  );

  for (let index = 0; index < NODE_COUNT; index += 1) {
    const group = index < COMMUNITY_COUNT
      ? index
      : Math.floor(random() * COMMUNITY_COUNT);
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * 270;
    const isCommunitySeed = index < COMMUNITY_COUNT;

    nodeGroups[index] = group;
    membersByCommunity[group].push(index);
    radii[index] = isCommunitySeed ? 15 + random() * 3 : 6 + random() * 6;
    chargeStrengthMultipliers[index] = isCommunitySeed ? 1.28 : 0.68 + random() * 0.42;
    initialX[index] = Math.cos(angle) * distance;
    initialY[index] = Math.sin(angle) * distance * 0.72;
  }

  // Dense local relationships form communities naturally. Sparse cross-group
  // relationships keep the result one connected graph.
  for (const members of membersByCommunity) {
    for (let memberIndex = 1; memberIndex < members.length; memberIndex += 1) {
      const source = members[memberIndex];
      const firstTarget = members[Math.floor(random() * memberIndex)];
      edgeSources.push(source);
      edgeTargets.push(firstTarget);

      if (memberIndex > 2) {
        const secondTarget = members[Math.floor(random() * memberIndex)];
        if (secondTarget !== firstTarget) {
          edgeSources.push(source);
          edgeTargets.push(secondTarget);
        }
      }

      if (memberIndex > 4 && random() < 0.52) {
        const thirdTarget = members[Math.floor(random() * memberIndex)];
        if (thirdTarget !== firstTarget) {
          edgeSources.push(source);
          edgeTargets.push(thirdTarget);
        }
      }
    }
  }

  for (let group = 0; group < COMMUNITY_COUNT; group += 1) {
    const nextGroup = (group + 1) % COMMUNITY_COUNT;
    const sourceMembers = membersByCommunity[group];
    const targetMembers = membersByCommunity[nextGroup];
    const source = sourceMembers[Math.floor(random() * sourceMembers.length)];
    const target = targetMembers[Math.floor(random() * targetMembers.length)];
    edgeSources.push(source);
    edgeTargets.push(target);
  }

  return {
    input: {
      chargeStrengthMultipliers,
      edgeSources: Uint32Array.from(edgeSources),
      edgeTargets: Uint32Array.from(edgeTargets),
      initialX,
      initialY,
      nodeIds,
      radii,
    },
    nodeGroups,
  };
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    state += 0x6d2b_79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function createPointerForce(
  layout: GraphLayoutEngine,
  pointer: PointerPosition,
): GraphLayoutExternalForce {
  return {
    beforeIntegration: alpha => {
      const influenceRadius = 190;
      const influenceRadiusSquared = influenceRadius * influenceRadius;

      for (let index = 0; index < layout.nodeIds.length; index += 1) {
        const dx = layout.x[index] - pointer.x;
        const dy = layout.y[index] - pointer.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= influenceRadiusSquared || distanceSquared < 0.01) continue;

        const distance = Math.sqrt(distanceSquared);
        const strength = (1 - distance / influenceRadius) * 1.45 * alpha;
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
  nodeGroups: Uint8Array,
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
    context.strokeStyle = nodeGroups[source] === nodeGroups[target]
      ? 'rgba(190, 219, 255, 0.27)'
      : 'rgba(255, 174, 145, 0.18)';
    context.stroke();
  }

  for (let index = 0; index < layout.nodeIds.length; index += 1) {
    const radius = Math.max(4.5, layout.radii[index] * 0.78);
    context.beginPath();
    context.arc(layout.x[index], layout.y[index], radius, 0, Math.PI * 2);
    context.fillStyle = nodeFill(nodeGroups[index], radius);
    context.fill();
  }

  context.restore();
}

function nodeFill(group: number, radius: number): string {
  if (radius > 10) return 'rgba(255, 151, 123, 0.88)';
  const colors = [
    'rgba(224, 239, 255, 0.78)',
    'rgba(126, 176, 255, 0.82)',
    'rgba(190, 174, 255, 0.78)',
    'rgba(255, 205, 139, 0.78)',
    'rgba(162, 208, 240, 0.8)',
  ] as const;
  return colors[group % colors.length];
}
