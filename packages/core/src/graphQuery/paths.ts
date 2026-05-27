import type { IGraphData } from '../graph/contracts';
import type { GraphQueryPathConfig, GraphQueryPathReport } from './model';
import {
  DEFAULT_MAX_DEPTH,
  DEFAULT_MAX_PATHS,
  graphHasEndpoints,
  normalizePositiveInteger,
} from './pathConfig';
import { collectDirectedPaths } from './pathTraversal';

export function findGraphPaths(
  graphData: IGraphData,
  config: GraphQueryPathConfig,
): GraphQueryPathReport {
  const maxDepth = normalizePositiveInteger(config.maxDepth, DEFAULT_MAX_DEPTH);
  const maxPaths = normalizePositiveInteger(config.maxPaths, DEFAULT_MAX_PATHS);
  const paths = graphHasEndpoints(graphData, config)
    ? collectDirectedPaths(graphData, config, maxDepth, maxPaths)
    : [];

  return {
    from: config.from,
    to: config.to,
    paths,
    limits: {
      maxDepth,
      maxPaths,
    },
  };
}
