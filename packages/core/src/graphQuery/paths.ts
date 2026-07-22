import type { IGraphData } from '../graph/contracts';
import type { GraphQueryPathConfig, GraphQueryPathReport } from './model';
import {
  DEFAULT_MAX_DEPTH,
  DEFAULT_MAX_PATHS,
  graphHasEndpoints,
  normalizePositiveInteger,
} from './pathConfig';
import { collectDirectedPathResult } from './pathTraversal';
import {
  isFileSelector,
  projectPathToFiles,
  resolveSelectorNodeIds,
} from './fileEndpoints';

const RAW_PATHS_PER_PROJECTED_PATH = 20;
const MAX_RAW_PATH_BUDGET = 1000;

interface PathCollection {
  paths: string[][];
  truncated: boolean;
}

function collectExpandedPaths(
  graphData: IGraphData,
  config: GraphQueryPathConfig,
  maxDepth: number,
  maxPaths: number,
): PathCollection {
  const fromIds = resolveSelectorNodeIds(graphData, config.from, config.expandFileSelectors === true);
  const toIds = resolveSelectorNodeIds(graphData, config.to, config.expandFileSelectors === true);
  const paths: string[][] = [];
  let truncated = false;

  for (const from of fromIds) {
    for (const to of toIds) {
      const result = collectDirectedPathResult(
        graphData,
        { ...config, from, to },
        maxDepth,
        Math.max(1, maxPaths - paths.length),
      );
      paths.push(...result.paths);
      truncated ||= result.truncated;
      if (paths.length >= maxPaths) return { paths: paths.slice(0, maxPaths), truncated: true };
    }
  }

  return { paths, truncated };
}

function collectProjectedFilePaths(
  graphData: IGraphData,
  config: GraphQueryPathConfig,
  maxDepth: number,
  maxPaths: number,
): PathCollection {
  const fromIds = resolveSelectorNodeIds(graphData, config.from, true);
  const toIds = resolveSelectorNodeIds(graphData, config.to, true);
  const rawPathBudget = Math.min(MAX_RAW_PATH_BUDGET, maxPaths * RAW_PATHS_PER_PROJECTED_PATH);
  const uniquePaths = new Map<string, string[]>();
  let rawPathCount = 0;
  let truncated = false;

  for (const from of fromIds) {
    for (const to of toIds) {
      const remainingBudget = rawPathBudget - rawPathCount;
      if (remainingBudget <= 0) return { paths: [...uniquePaths.values()], truncated: true };
      const result = collectDirectedPathResult(
        graphData,
        { ...config, from, to },
        maxDepth,
        remainingBudget,
      );
      truncated ||= result.truncated;
      rawPathCount += result.paths.length;
      for (const rawPath of result.paths) {
        const projected = projectPathToFiles(graphData, rawPath);
        if (projected.length > 1) uniquePaths.set(JSON.stringify(projected), projected);
        if (uniquePaths.size >= maxPaths) {
          return { paths: [...uniquePaths.values()], truncated: true };
        }
      }
    }
  }

  return { paths: [...uniquePaths.values()], truncated };
}

export function findGraphPaths(
  graphData: IGraphData,
  config: GraphQueryPathConfig,
): GraphQueryPathReport {
  const maxDepth = normalizePositiveInteger(config.maxDepth, DEFAULT_MAX_DEPTH);
  const maxPaths = normalizePositiveInteger(config.maxPaths, DEFAULT_MAX_PATHS);
  const shouldProject = config.projectFileEndpoints === true
    && isFileSelector(graphData, config.from)
    && isFileSelector(graphData, config.to);
  const collection = shouldProject
    ? collectProjectedFilePaths(graphData, config, maxDepth, maxPaths)
    : config.expandFileSelectors
      ? collectExpandedPaths(graphData, config, maxDepth, maxPaths)
      : graphHasEndpoints(graphData, config)
        ? collectDirectedPathResult(graphData, config, maxDepth, maxPaths)
        : { paths: [], truncated: false };

  return {
    from: config.from,
    to: config.to,
    paths: collection.paths,
    complete: !collection.truncated,
    limits: {
      maxDepth,
      maxPaths,
    },
  };
}
