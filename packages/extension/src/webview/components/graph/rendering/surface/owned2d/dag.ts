import type { DagMode } from '../../../../../../shared/settings/modes';

export interface OwnedDagTargets {
  targetRadius: Float32Array;
  targetX: Float32Array;
  targetY: Float32Array;
}

function computeDepths(
  nodeCount: number,
  edgeSources: readonly number[],
  edgeTargets: readonly number[],
): Uint32Array {
  const adjacency = Array.from({ length: nodeCount }, () => [] as number[]);
  const indegree = new Uint32Array(nodeCount);
  for (let edge = 0; edge < edgeSources.length; edge += 1) {
    const source = edgeSources[edge];
    const target = edgeTargets[edge];
    if (source === target) continue;
    adjacency[source].push(target);
    indegree[target] += 1;
  }

  const queue = new Uint32Array(nodeCount);
  let read = 0;
  let write = 0;
  for (let index = 0; index < nodeCount; index += 1) {
    if (indegree[index] === 0) queue[write++] = index;
  }

  const depths = new Uint32Array(nodeCount);
  const processed = new Uint8Array(nodeCount);
  let processedCount = 0;
  while (processedCount < nodeCount) {
    if (read === write) {
      // Deterministically break cycles by promoting the lowest remaining node
      // to a root, equivalent to dropping its still-unresolved incoming edges.
      let cycleRoot = 0;
      while (cycleRoot < nodeCount && processed[cycleRoot] !== 0) cycleRoot += 1;
      if (cycleRoot >= nodeCount) break;
      indegree[cycleRoot] = 0;
      queue[write++] = cycleRoot;
    }
    const source = queue[read++];
    if (processed[source] !== 0) continue;
    processed[source] = 1;
    processedCount += 1;
    for (const target of adjacency[source]) {
      if (processed[target] !== 0) continue;
      depths[target] = Math.max(depths[target], depths[source] + 1);
      if (indegree[target] > 0) indegree[target] -= 1;
      if (indegree[target] === 0) queue[write++] = target;
    }
  }
  return depths;
}

export function createOwnedDagTargets(
  nodeCount: number,
  edgeSources: readonly number[],
  edgeTargets: readonly number[],
  mode: DagMode,
  levelDistance: number,
): OwnedDagTargets | undefined {
  if (!mode) return undefined;
  const distance = Math.max(1, levelDistance);
  const depths = computeDepths(nodeCount, edgeSources, edgeTargets);
  const targetRadius = new Float32Array(nodeCount).fill(Number.NaN);
  const targetX = new Float32Array(nodeCount).fill(Number.NaN);
  const targetY = new Float32Array(nodeCount).fill(Number.NaN);
  let maximumDepth = 0;
  for (const depth of depths) maximumDepth = Math.max(maximumDepth, depth);

  if (mode === 'td' || mode === 'lr') {
    for (let index = 0; index < nodeCount; index += 1) {
      const rankedPosition = (depths[index] - maximumDepth / 2) * distance;
      if (mode === 'td') targetY[index] = rankedPosition;
      else targetX[index] = rankedPosition;
    }
    return { targetRadius, targetX, targetY };
  }

  for (let index = 0; index < nodeCount; index += 1) {
    targetRadius[index] = depths[index] * distance;
  }
  return { targetRadius, targetX, targetY };
}
