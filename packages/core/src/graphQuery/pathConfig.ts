import type { IGraphData } from '../graph/contracts';
import type { GraphQueryPathConfig } from './model';

export const DEFAULT_MAX_DEPTH = 10;
export const DEFAULT_MAX_PATHS = 3;

export function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.floor(value));
}

export function graphHasEndpoints(graphData: IGraphData, config: GraphQueryPathConfig): boolean {
  const nodeIds = new Set(graphData.nodes.map((node) => node.id));
  return nodeIds.has(config.from) && nodeIds.has(config.to);
}
