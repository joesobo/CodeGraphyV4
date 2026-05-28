import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';

export const EDGE_FEATHER = 28;
export const EDGE_NODE_GAP = 2;
export const FIELD_SELECTOR = '[data-force-field-section="true"]';

const MAX_NODE_COUNT = 34;
const MIN_NODE_COUNT = 26;
const MAX_CLUSTER_COUNT = 5;
const MIN_CLUSTER_COUNT = 3;

export type Viewport = {
  height: number;
  width: number;
};

export type MaskRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type ForceNode = SimulationNodeDatum & {
  clusterId: number;
  fill: string;
  id: number;
  opacity: number;
  pull: number;
  radius: number;
  stroke: string;
};

export type ForceEdge = SimulationLinkDatum<ForceNode> & {
  distance: number;
  id: string;
  opacity: number;
  strength: number;
  width: number;
};

export type EdgeSegment = {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

export type RandomSource = () => number;

export type ForceCollisionSettings = {
  collisionPadding: number;
  sizeMultiplier: number;
};

export type ForceLinkDistanceSettings = ForceCollisionSettings & {
  distanceMultiplier: number;
  linkDistancePadding?: number;
  sizeDistanceMultiplier: number;
};

function randomBetween(random: RandomSource, min: number, max: number): number {
  return min + random() * (max - min);
}

function randomInt(random: RandomSource, min: number, max: number): number {
  return Math.floor(randomBetween(random, min, max + 1));
}

function blueColor(random: RandomSource): string {
  return `hsl(${randomInt(random, 196, 216)} ${randomInt(random, 68, 92)}% ${randomInt(random, 45, 68)}%)`;
}

export function createForceNodes(viewport: Viewport, random: RandomSource = Math.random): ForceNode[] {
  const nodeCount = randomInt(random, MIN_NODE_COUNT, MAX_NODE_COUNT);
  const clusterCount = randomInt(random, MIN_CLUSTER_COUNT, MAX_CLUSTER_COUNT);
  const startX = viewport.width * 0.72;
  const startY = viewport.height * 0.28;
  const clusterCenters = Array.from({ length: clusterCount }, (_, clusterIndex) => {
    const angle = clusterIndex * ((Math.PI * 2) / clusterCount) + randomBetween(random, -0.3, 0.3);
    const distance = randomBetween(random, 24, 72);

    return {
      x: startX + Math.cos(angle) * distance,
      y: startY + Math.sin(angle) * distance,
    };
  });

  return Array.from({ length: nodeCount }, (_, index) => {
    const clusterId = index % clusterCount;
    const center = clusterCenters[clusterId];
    const angle = randomBetween(random, 0, Math.PI * 2);
    const distance = randomBetween(random, 12, 56);
    const radius = randomBetween(random, 5.4, 11.8);

    return {
      clusterId,
      fill: blueColor(random),
      id: index,
      opacity: randomBetween(random, 0.24, 0.42),
      pull: randomBetween(random, 0.048, 0.076),
      radius,
      stroke: 'hsl(210 88% 88% / 0.62)',
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance,
    };
  });
}

export function createForceEdges(nodes: ForceNode[], random: RandomSource = Math.random): ForceEdge[] {
  const edges: ForceEdge[] = [];
  const edgeIds = new Set<string>();
  const addEdge = (
    source: number,
    target: number,
    options: {
      distance: number;
      opacity: number;
      strength: number;
      width: number;
    },
  ): void => {
    if (source === target) {
      return;
    }

    const id = source < target ? `${source}-${target}` : `${target}-${source}`;

    if (edgeIds.has(id)) {
      return;
    }

    edgeIds.add(id);
    edges.push({
      ...options,
      id,
      source,
      target,
    });
  };
  const clusterMap = new Map<number, number[]>();

  nodes.forEach(node => {
    clusterMap.set(node.clusterId, [...(clusterMap.get(node.clusterId) ?? []), node.id]);
  });

  const clusters = Array.from(clusterMap.values()).filter(cluster => cluster.length > 0);

  clusters.forEach(cluster => {
    for (let index = 1; index < cluster.length; index += 1) {
      addEdge(cluster[index - 1], cluster[index], {
        distance: randomBetween(random, 26, 42),
        opacity: randomBetween(random, 0.14, 0.23),
        strength: randomBetween(random, 0.34, 0.54),
        width: randomBetween(random, 0.9, 1.35),
      });
    }

    cluster.forEach(source => {
      const extraEdgeCount = random() > 0.55 ? 2 : 1;

      for (let extraIndex = 0; extraIndex < extraEdgeCount; extraIndex += 1) {
        const target = cluster[randomInt(random, 0, cluster.length - 1)];

        addEdge(source, target, {
          distance: randomBetween(random, 34, 58),
          opacity: randomBetween(random, 0.08, 0.16),
          strength: randomBetween(random, 0.16, 0.3),
          width: randomBetween(random, 0.7, 1.05),
        });
      }
    });
  });

  for (let clusterIndex = 1; clusterIndex < clusters.length; clusterIndex += 1) {
    const previousCluster = clusters[clusterIndex - 1];
    const currentCluster = clusters[clusterIndex];

    addEdge(previousCluster[randomInt(random, 0, previousCluster.length - 1)], currentCluster[randomInt(random, 0, currentCluster.length - 1)], {
      distance: randomBetween(random, 68, 96),
      opacity: randomBetween(random, 0.06, 0.12),
      strength: randomBetween(random, 0.045, 0.08),
      width: randomBetween(random, 0.65, 0.95),
    });
  }

  return edges;
}

export function forceNodeCollisionRadius(node: ForceNode, settings: ForceCollisionSettings): number {
  return node.radius * settings.sizeMultiplier + settings.collisionPadding;
}

export function forceNodeVisibleRadius(node: ForceNode, settings: Pick<ForceCollisionSettings, 'sizeMultiplier'>): number {
  return node.radius * settings.sizeMultiplier;
}

export function getSafeLinkDistance(
  preferredDistance: number,
  source: ForceNode,
  target: ForceNode,
  settings: ForceCollisionSettings & { linkDistancePadding?: number },
): number {
  return Math.max(
    preferredDistance,
    forceNodeVisibleRadius(source, settings) + forceNodeVisibleRadius(target, settings) + (settings.linkDistancePadding ?? EDGE_NODE_GAP * 2),
  );
}

export function getForceLinkDistance(
  baseDistance: number,
  source: ForceNode,
  target: ForceNode,
  settings: ForceLinkDistanceSettings,
): number {
  return getSafeLinkDistance(baseDistance * settings.distanceMultiplier * settings.sizeDistanceMultiplier, source, target, settings);
}

export function limitForceNodeVelocity(node: ForceNode, maxVelocity: number): void {
  const velocityX = node.vx ?? 0;
  const velocityY = node.vy ?? 0;
  const speed = Math.hypot(velocityX, velocityY);

  if (speed <= maxVelocity || speed === 0) {
    return;
  }

  const scale = maxVelocity / speed;

  node.vx = velocityX * scale;
  node.vy = velocityY * scale;
}

function fallbackSeparationAngle(sourceId: number, targetId: number): number {
  return ((sourceId + 1) * 1.618 + (targetId + 1) * 2.414) % (Math.PI * 2);
}

function dampForceNodeVelocity(node: ForceNode): void {
  node.vx = (node.vx ?? 0) * 0.25;
  node.vy = (node.vy ?? 0) * 0.25;
}

export function separateOverlappingForceNodes(
  nodes: ForceNode[],
  settings: ForceCollisionSettings,
  iterations = 2,
): boolean {
  let separated = false;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let sourceIndex = 0; sourceIndex < nodes.length; sourceIndex += 1) {
      for (let targetIndex = sourceIndex + 1; targetIndex < nodes.length; targetIndex += 1) {
        const source = nodes[sourceIndex];
        const target = nodes[targetIndex];
        const sourceX = source.x ?? 0;
        const sourceY = source.y ?? 0;
        const targetX = target.x ?? sourceX;
        const targetY = target.y ?? sourceY;
        const deltaX = targetX - sourceX;
        const deltaY = targetY - sourceY;
        const distance = Math.hypot(deltaX, deltaY);
        const requiredDistance = forceNodeCollisionRadius(source, settings) + forceNodeCollisionRadius(target, settings);

        if (distance >= requiredDistance) {
          continue;
        }

        const angle = distance === 0 ? fallbackSeparationAngle(source.id, target.id) : Math.atan2(deltaY, deltaX);
        const unitX = Math.cos(angle);
        const unitY = Math.sin(angle);
        const separation = (requiredDistance - distance) / 2 + 0.001;

        source.x = sourceX - unitX * separation;
        source.y = sourceY - unitY * separation;
        target.x = targetX + unitX * separation;
        target.y = targetY + unitY * separation;
        dampForceNodeVelocity(source);
        dampForceNodeVelocity(target);
        separated = true;
      }
    }
  }

  return separated;
}

export function createVisibleEdgeSegment(
  source: ForceNode,
  target: ForceNode,
  fallback: { x: number; y: number },
  gap = EDGE_NODE_GAP,
  radiusMultiplier = 1,
): EdgeSegment | null {
  const sourceX = source.x ?? fallback.x;
  const sourceY = source.y ?? fallback.y;
  const targetX = target.x ?? fallback.x;
  const targetY = target.y ?? fallback.y;
  const deltaX = targetX - sourceX;
  const deltaY = targetY - sourceY;
  const length = Math.hypot(deltaX, deltaY);
  const sourceRadius = source.radius * radiusMultiplier;
  const targetRadius = target.radius * radiusMultiplier;

  if (length <= sourceRadius + targetRadius + gap * 2 + 1) {
    return null;
  }

  const unitX = deltaX / length;
  const unitY = deltaY / length;
  const sourceOffset = sourceRadius + gap;
  const targetOffset = targetRadius + gap;

  return {
    x1: sourceX + unitX * sourceOffset,
    x2: targetX - unitX * targetOffset,
    y1: sourceY + unitY * sourceOffset,
    y2: targetY - unitY * targetOffset,
  };
}

export function readForceSectionRects(viewport: Viewport): MaskRect[] {
  if (typeof document === 'undefined') {
    return [];
  }

  return Array.from(document.querySelectorAll<HTMLElement>(FIELD_SELECTOR))
    .map(element => element.getBoundingClientRect())
    .filter(rect => rect.bottom >= -EDGE_FEATHER && rect.top <= viewport.height + EDGE_FEATHER)
    .map(rect => ({
      height: Math.max(0, rect.height),
      width: Math.max(0, rect.width),
      x: rect.left,
      y: rect.top,
    }));
}
