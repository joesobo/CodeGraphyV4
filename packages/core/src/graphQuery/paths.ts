import type { IGraphData } from '../graph/contracts';
import type { GraphQueryPathConfig, GraphQueryPathReport } from './model';
import {
  DEFAULT_MAX_DEPTH,
  DEFAULT_MAX_PATHS,
  graphHasEndpoints,
  normalizePositiveInteger,
} from './pathConfig';
import { collectDirectedPaths } from './pathTraversal';
import {
  isFileSelector,
  projectPathToFiles,
  resolveSelectorNodeIds,
} from './fileEndpoints';

const RAW_PATHS_PER_PROJECTED_PATH = 20;
const MAX_RAW_PATH_BUDGET = 1000;

function collectExpandedPaths(
  graphData: IGraphData,
  config: GraphQueryPathConfig,
  maxDepth: number,
  maxPaths: number,
): string[][] {
  const fromIds = resolveSelectorNodeIds(graphData, config.from, config.expandFileSelectors === true);
  const toIds = resolveSelectorNodeIds(graphData, config.to, config.expandFileSelectors === true);
  const paths: string[][] = [];

  for (const from of fromIds) {
    for (const to of toIds) {
      paths.push(...collectDirectedPaths(graphData, { ...config, from, to }, maxDepth, maxPaths));
      if (paths.length >= maxPaths) return paths.slice(0, maxPaths);
    }
  }

  return paths;
}

function collectProjectedFilePaths(
  graphData: IGraphData,
  config: GraphQueryPathConfig,
  maxDepth: number,
  maxPaths: number,
): string[][] {
  const fromIds = resolveSelectorNodeIds(graphData, config.from, true);
  const toIds = resolveSelectorNodeIds(graphData, config.to, true);
  const rawPathBudget = Math.min(MAX_RAW_PATH_BUDGET, maxPaths * RAW_PATHS_PER_PROJECTED_PATH);
  const uniquePaths = new Map<string, string[]>();
  let rawPathCount = 0;

  for (const from of fromIds) {
    for (const to of toIds) {
      const remainingBudget = rawPathBudget - rawPathCount;
      if (remainingBudget <= 0) return [...uniquePaths.values()];
      const rawPaths = collectDirectedPaths(
        graphData,
        { ...config, from, to },
        maxDepth,
        remainingBudget,
      );
      rawPathCount += rawPaths.length;
      for (const rawPath of rawPaths) {
        const projected = projectPathToFiles(graphData, rawPath);
        if (projected.length > 1) uniquePaths.set(JSON.stringify(projected), projected);
        if (uniquePaths.size >= maxPaths) return [...uniquePaths.values()];
      }
    }
  }

  return [...uniquePaths.values()];
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
  const paths = shouldProject
    ? collectProjectedFilePaths(graphData, config, maxDepth, maxPaths)
    : config.expandFileSelectors
      ? collectExpandedPaths(graphData, config, maxDepth, maxPaths)
      : graphHasEndpoints(graphData, config)
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
