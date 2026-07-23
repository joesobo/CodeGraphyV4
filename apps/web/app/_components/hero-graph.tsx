'use client';

import {
  createGraphLayoutEngine,
  prepareGraphPhysics,
  type GraphLayoutEngine,
  type GraphLayoutExternalForce,
  type GraphLayoutInput,
} from '@codegraphy-dev/graph-renderer';
import { useEffect, useRef } from 'react';

const COMMUNITY_COUNT = 6;
const MAX_NODE_COUNT = 104;
const MIN_NODE_COUNT = 78;
const NODE_COLORS = [
  [238, 248, 255],
  [169, 214, 249],
  [213, 235, 255],
  [128, 190, 239],
  [198, 229, 252],
  [151, 204, 245],
] satisfies [number, number, number][];

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
  nodeHoverScales: Float32Array;
  nodeOpacities: Float32Array;
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

function createGraphData(seed: number): HeroGraphData {
  const random = createSeededRandom(seed);
  const nodeCount = MIN_NODE_COUNT + Math.floor(random() * (MAX_NODE_COUNT - MIN_NODE_COUNT + 1));
  const nodeIds: string[] = Array.from({ length: nodeCount }, (_, index) => `hero-node-${index}`);
  const radii = new Float32Array(nodeCount);
  const chargeStrengthMultipliers = new Float32Array(nodeCount);
  const initialX = new Float32Array(nodeCount);
  const initialY = new Float32Array(nodeCount);
  const nodeGroups = new Uint8Array(nodeCount);
  const nodeHoverScales = new Float32Array(nodeCount);
  const nodeOpacities = new Float32Array(nodeCount);
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
    const distance = Math.sqrt(random()) * 300;
    const isCommunitySeed = index < COMMUNITY_COUNT;

    nodeGroups[index] = group;
    nodeHoverScales[index] = 1;
    nodeOpacities[index] = 0.25 + random() * 0.25;
    orbitSpeedMultipliers[index] = 0.7 + random() * 0.65;
    membersByCommunity[group].push(index);
    radii[index] = isCommunitySeed ? 15 + random() * 3 : 6 + random() * 6;
    chargeStrengthMultipliers[index] = isCommunitySeed ? 1.28 : 0.68 + random() * 0.42;
    initialX[index] = Math.cos(angle) * distance * 1.3;
    initialY[index] = Math.sin(angle) * distance * 0.68;
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

      if (memberIndex > 4 && random() < 0.68) {
        const thirdTarget = members[Math.floor(random() * memberIndex)];
        if (thirdTarget !== firstTarget) {
          edgeSources.push(source);
          edgeTargets.push(thirdTarget);
        }
      }

      if (memberIndex > 7 && random() < 0.28) {
        const fourthTarget = members[Math.floor(random() * memberIndex)];
        if (fourthTarget !== firstTarget) {
          edgeSources.push(source);
          edgeTargets.push(fourthTarget);
        }
      }
    }
  }

  const communityOrder: number[] = Array.from(
    { length: COMMUNITY_COUNT },
    (_, index): number => index,
  );
  for (let index = communityOrder.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1));
    [communityOrder[index], communityOrder[targetIndex]] = [
      communityOrder[targetIndex],
      communityOrder[index],
    ];
  }

  // A randomized spanning tree keeps all communities connected without arranging
  // them as a cycle. Extra cross-links make the silhouette less predictable.
  for (let index = 1; index < communityOrder.length; index += 1) {
    const sourceGroup = communityOrder[index];
    const targetGroup = communityOrder[Math.floor(random() * index)];
    const sourceMembers = membersByCommunity[sourceGroup];
    const targetMembers = membersByCommunity[targetGroup];
    const source = sourceMembers[Math.floor(random() * sourceMembers.length)];
    const target = targetMembers[Math.floor(random() * targetMembers.length)];
    edgeSources.push(source);
    edgeTargets.push(target);
  }

  for (let index = 0; index < COMMUNITY_COUNT * 2; index += 1) {
    const sourceGroup = Math.floor(random() * COMMUNITY_COUNT);
    const targetGroup = (sourceGroup + 1 + Math.floor(random() * (COMMUNITY_COUNT - 1)))
      % COMMUNITY_COUNT;
    const sourceMembers = membersByCommunity[sourceGroup];
    const targetMembers = membersByCommunity[targetGroup];
    edgeSources.push(sourceMembers[Math.floor(random() * sourceMembers.length)]);
    edgeTargets.push(targetMembers[Math.floor(random() * targetMembers.length)]);
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
    nodeHoverScales,
    nodeOpacities,
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

function updatePointerPosition(pointer: PointerPosition): void {
  const smoothing = pointer.active ? 0.14 : 0.06;
  pointer.currentX += (pointer.targetX - pointer.currentX) * smoothing;
  pointer.currentY += (pointer.targetY - pointer.currentY) * smoothing;
}

function createHeroForces(
  layout: GraphLayoutEngine,
  orbitSpeedMultipliers: Float32Array,
  getCanvasSize: () => CanvasSize,
): GraphLayoutExternalForce {
  let ambientPhase = 0;

  return {
    beforeIntegration: alpha => {
      ambientPhase += 0.006;
      let centerX = 0;
      let centerY = 0;

      for (let index = 0; index < layout.nodeIds.length; index += 1) {
        centerX += layout.x[index];
        centerY += layout.y[index];
      }

      centerX /= layout.nodeIds.length;
      centerY /= layout.nodeIds.length;

      const settleProgress = 1 - Math.min(1, Math.max(0, alpha - 0.014) / 0.3);
      const anchorAcceleration = 0.0016 * (0.4 + settleProgress * 0.6);
      const clusterGravity = 0.0002 * (0.35 + settleProgress * 0.65);
      const orbitAcceleration = 0.000095 * (0.2 + settleProgress * 0.8);
      const driftAcceleration = 0.012 * (0.25 + settleProgress * 0.75);

      for (let index = 0; index < layout.nodeIds.length; index += 1) {
        layout.vx[index] -= centerX * anchorAcceleration;
        layout.vy[index] -= centerY * anchorAcceleration;

        const clusterOffsetX = layout.x[index] - centerX;
        const clusterOffsetY = layout.y[index] - centerY;
        layout.vx[index] -= clusterOffsetX * clusterGravity * 0.42;
        layout.vy[index] -= clusterOffsetY * clusterGravity;

        const offsetX = layout.x[index] - centerX;
        const offsetY = layout.y[index] - centerY;
        const orbitSpeed = orbitAcceleration * orbitSpeedMultipliers[index];
        layout.vx[index] -= offsetY * orbitSpeed;
        layout.vy[index] += offsetX * orbitSpeed;

        const driftPhase = ambientPhase * (0.75 + Math.abs(orbitSpeedMultipliers[index]) * 0.3)
          + index * 2.399;
        layout.vx[index] += Math.cos(driftPhase) * driftAcceleration;
        layout.vy[index] += Math.sin(driftPhase * 0.86) * driftAcceleration;
      }
    },
    afterIntegration: () => ({
      positionChanged: containGraphWithinCanvas(layout, getCanvasSize()),
    }),
  };
}

function containGraphWithinCanvas(
  layout: GraphLayoutEngine,
  size: CanvasSize,
): boolean {
  const scale = graphScale(size);
  const halfWidth = size.width / (scale * 2);
  const halfHeight = size.height / (scale * 2);
  let positionChanged = false;

  for (let index = 0; index < layout.nodeIds.length; index += 1) {
    const renderedRadius = (
      Math.max(4.5, layout.radii[index] * 0.78) * 1.22 + 2
    ) / scale;
    const boundedHalfWidth = Math.max(renderedRadius, halfWidth);
    const boundedHalfHeight = Math.max(renderedRadius, halfHeight);
    const minX = -boundedHalfWidth + renderedRadius;
    const maxX = boundedHalfWidth - renderedRadius;
    const minY = -boundedHalfHeight + renderedRadius;
    const maxY = boundedHalfHeight - renderedRadius;

    if (layout.x[index] < minX) {
      layout.x[index] = minX;
      layout.vx[index] = Math.abs(layout.vx[index]) * 0.58;
      positionChanged = true;
    } else if (layout.x[index] > maxX) {
      layout.x[index] = maxX;
      layout.vx[index] = -Math.abs(layout.vx[index]) * 0.58;
      positionChanged = true;
    }

    if (layout.y[index] < minY) {
      layout.y[index] = minY;
      layout.vy[index] = Math.abs(layout.vy[index]) * 0.58;
      positionChanged = true;
    } else if (layout.y[index] > maxY) {
      layout.y[index] = maxY;
      layout.vy[index] = -Math.abs(layout.vy[index]) * 0.58;
      positionChanged = true;
    }
  }

  return positionChanged;
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
  return Math.max(0.78, Math.min(size.width / 720, size.height / 540));
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
