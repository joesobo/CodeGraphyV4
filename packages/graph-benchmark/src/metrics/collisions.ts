export interface VisibleCollisionNodeSnapshot {
  collisionRadius: number;
  positionFinite: boolean;
  screenX: number;
  screenY: number;
  x: number;
  y: number;
}

export interface VisibleCollisionSnapshot {
  nodes: readonly VisibleCollisionNodeSnapshot[];
  zoom: number | null;
}

export interface VisibleCollisionAssessment {
  finitePositions: boolean;
  maximumPenetrationPx: number;
  violations: number;
}

const COLLISION_TOLERANCE_PX = 0.5;

function invalidAssessment(): VisibleCollisionAssessment {
  return {
    finitePositions: false,
    maximumPenetrationPx: Number.POSITIVE_INFINITY,
    violations: Number.MAX_SAFE_INTEGER,
  };
}

export function assessVisibleNodeCollisions(
  snapshot: VisibleCollisionSnapshot | null,
): VisibleCollisionAssessment {
  if (!snapshot || !Number.isFinite(snapshot.zoom) || (snapshot.zoom ?? 0) <= 0) {
    return invalidAssessment();
  }
  const finitePositions = snapshot.nodes.every(node =>
    node.positionFinite
    && Number.isFinite(node.x)
    && Number.isFinite(node.y)
    && Number.isFinite(node.screenX)
    && Number.isFinite(node.screenY)
    && Number.isFinite(node.collisionRadius),
  );
  if (!finitePositions) return invalidAssessment();

  const screenScale = Math.sqrt(snapshot.zoom as number);
  const nodes = snapshot.nodes.map(node => ({
    x: node.screenX,
    y: node.screenY,
    radius: Math.max(0, node.collisionRadius * screenScale),
  }));
  const maximumRadius = nodes.reduce(
    (maximum, node) => Math.max(maximum, node.radius),
    1,
  );
  const cellSize = maximumRadius * 2;
  const cells = new Map<string, number[]>();
  nodes.forEach((node, index) => {
    const key = `${Math.floor(node.x / cellSize)},${Math.floor(node.y / cellSize)}`;
    const cell = cells.get(key) ?? [];
    cell.push(index);
    cells.set(key, cell);
  });

  let maximumPenetrationPx = 0;
  let violations = 0;
  nodes.forEach((node, index) => {
    const cellX = Math.floor(node.x / cellSize);
    const cellY = Math.floor(node.y / cellSize);
    for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
      for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
        const neighbors = cells.get(`${cellX + xOffset},${cellY + yOffset}`) ?? [];
        for (const neighborIndex of neighbors) {
          if (neighborIndex <= index) continue;
          const neighbor = nodes[neighborIndex];
          const distance = Math.hypot(node.x - neighbor.x, node.y - neighbor.y);
          const penetration = node.radius + neighbor.radius - distance;
          maximumPenetrationPx = Math.max(maximumPenetrationPx, penetration);
          if (penetration > COLLISION_TOLERANCE_PX) violations += 1;
        }
      }
    }
  });

  return { finitePositions: true, maximumPenetrationPx, violations };
}
