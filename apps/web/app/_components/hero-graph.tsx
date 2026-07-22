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
const MAX_NODE_COUNT = 84;
const MIN_NODE_COUNT = 64;

interface CanvasSize {
  height: number;
  width: number;
}

interface PointerPosition {
  active: boolean;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
}

interface HeroGraphData {
  input: GraphLayoutInput;
  nodeGroups: Uint8Array;
  orbitSpeedMultipliers: Float32Array;
}

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
  const graphData = createGraphData(createRandomSeed());
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
      chargeDistanceMax: 310,
      chargeStrength: -205,
      collisionPadding: 6,
      initializationSpacing: 14,
      linkDistance: 25,
      linkStrength: 2,
      settleSpeed: 0.5,
      velocityDecay: 0.29,
    });
    layout.setAlphaTarget(0.006);
    const pointer: PointerPosition = {
      active: false,
      currentX: 0,
      currentY: 0,
      targetX: 0,
      targetY: 0,
    };
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const heroForces = createHeroForces(layout, pointer, graphData.orbitSpeedMultipliers);
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
      const wasActive = pointer.active;
      pointer.active = event.clientX >= bounds.left
        && event.clientX <= bounds.right
        && event.clientY >= bounds.top
        && event.clientY <= bounds.bottom;
      if (!pointer.active) {
        pointer.targetX = 0;
        pointer.targetY = 0;
        if (wasActive) layout.reheat(0.2);
        return;
      }

      const scale = graphScale(canvasSize);
      pointer.targetX = (event.clientX - bounds.left - canvasSize.width / 2) / scale;
      pointer.targetY = (event.clientY - bounds.top - canvasSize.height / 2) / scale;
      layout.reheat(0.36);
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
        updatePointerCenter(pointer);
        layout.tick(heroForces);
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

function createGraphData(seed: number): HeroGraphData {
  const random = createSeededRandom(seed);
  const nodeCount = MIN_NODE_COUNT + Math.floor(random() * (MAX_NODE_COUNT - MIN_NODE_COUNT + 1));
  const nodeIds: string[] = Array.from({ length: nodeCount }, (_, index) => `hero-node-${index}`);
  const radii = new Float32Array(nodeCount);
  const chargeStrengthMultipliers = new Float32Array(nodeCount);
  const initialX = new Float32Array(nodeCount);
  const initialY = new Float32Array(nodeCount);
  const nodeGroups = new Uint8Array(nodeCount);
  const orbitSpeedMultipliers = new Float32Array(nodeCount);
  const edgeSources: number[] = [];
  const edgeTargets: number[] = [];
  const membersByCommunity: number[][] = Array.from(
    { length: COMMUNITY_COUNT },
    (): number[] => [],
  );

  for (let index = 0; index < nodeCount; index += 1) {
    const group = index < COMMUNITY_COUNT
      ? index
      : Math.floor(random() * COMMUNITY_COUNT);
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * 390;
    const isCommunitySeed = index < COMMUNITY_COUNT;

    nodeGroups[index] = group;
    orbitSpeedMultipliers[index] = 0.92 + random() * 0.16;
    membersByCommunity[group].push(index);
    radii[index] = isCommunitySeed ? 15 + random() * 3 : 6 + random() * 6;
    chargeStrengthMultipliers[index] = isCommunitySeed ? 1.28 : 0.68 + random() * 0.42;
    initialX[index] = Math.cos(angle) * distance;
    initialY[index] = Math.sin(angle) * distance * 0.78;
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
    orbitSpeedMultipliers,
  };
}

function createRandomSeed(): number {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return values[0] ?? Date.now();
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

function updatePointerCenter(pointer: PointerPosition): void {
  const smoothing = pointer.active ? 0.4 : 0.1;
  pointer.currentX += (pointer.targetX - pointer.currentX) * smoothing;
  pointer.currentY += (pointer.targetY - pointer.currentY) * smoothing;
}

function createHeroForces(
  layout: GraphLayoutEngine,
  pointer: PointerPosition,
  orbitSpeedMultipliers: Float32Array,
): GraphLayoutExternalForce {
  return {
    beforeIntegration: alpha => {
      let centerX = 0;
      let centerY = 0;

      for (let index = 0; index < layout.nodeIds.length; index += 1) {
        centerX += layout.x[index];
        centerY += layout.y[index];
      }

      centerX /= layout.nodeIds.length;
      centerY /= layout.nodeIds.length;

      const effectiveAlpha = Math.max(alpha, pointer.active ? 0.2 : 0.12);
      const followStrength = (pointer.active ? 0.055 : 0.025) * effectiveAlpha;
      const maxImpulse = pointer.active ? 4.8 : 2.8;
      const impulseX = Math.max(
        -maxImpulse,
        Math.min(maxImpulse, (pointer.currentX - centerX) * followStrength),
      );
      const impulseY = Math.max(
        -maxImpulse,
        Math.min(maxImpulse, (pointer.currentY - centerY) * followStrength),
      );
      const settleProgress = 1 - Math.min(1, Math.max(0, alpha - 0.006) / 0.3);
      const orbitAcceleration = 0.00005 * (0.2 + settleProgress * 0.8);

      for (let index = 0; index < layout.nodeIds.length; index += 1) {
        layout.vx[index] += impulseX;
        layout.vy[index] += impulseY;

        const offsetX = layout.x[index] - pointer.currentX;
        const offsetY = layout.y[index] - pointer.currentY;
        const orbitSpeed = orbitAcceleration * orbitSpeedMultipliers[index];
        layout.vx[index] -= offsetY * orbitSpeed;
        layout.vy[index] += offsetX * orbitSpeed;
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
      ? 'rgba(190, 222, 255, 0.32)'
      : 'rgba(147, 195, 236, 0.22)';
    context.stroke();
  }

  for (let index = 0; index < layout.nodeIds.length; index += 1) {
    const radius = Math.max(4.5, layout.radii[index] * 0.78);
    context.beginPath();
    context.arc(layout.x[index], layout.y[index], radius, 0, Math.PI * 2);
    context.fillStyle = nodeFill(nodeGroups[index], radius);
    context.fill();
    context.lineWidth = 0.9 / scale;
    context.strokeStyle = 'rgba(224, 244, 255, 0.7)';
    context.stroke();
  }

  context.restore();
}

function nodeFill(group: number, radius: number): string {
  if (radius > 10) return 'rgba(184, 224, 255, 0.84)';
  const colors = [
    'rgba(213, 237, 255, 0.76)',
    'rgba(123, 184, 235, 0.82)',
    'rgba(164, 211, 247, 0.8)',
    'rgba(103, 170, 224, 0.82)',
    'rgba(150, 207, 235, 0.8)',
  ] as const;
  return colors[group % colors.length];
}
