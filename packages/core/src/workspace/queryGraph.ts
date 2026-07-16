import * as path from 'node:path';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { loadWorkspaceAnalysisDatabaseCache, readWorkspaceAnalysisDatabaseSnapshot } from '../graphCache/database/storage';
import { buildWorkspaceGraphDataFromAnalysis } from '../graph/data';
import { filterInactivePluginFileAnalysis, filterInactivePluginSnapshotFacts } from '../plugins/activityState/analysisFacts';
import { createDisabledPluginSet, createPluginActivityState } from '../plugins/activityState/model';
import type { CodeGraphyInstalledPluginCache } from '../plugins/installedCache';
import { CODEGRAPHY_MARKDOWN_PLUGIN_ID, readCodeGraphyWorkspaceSettings } from './settings';
import { normalizeWorkspaceQueryFacts } from './queryFacts';
import { matchesAnyPattern } from '../discovery/pathMatching';
import type { IGraphData } from '../graph/contracts';
import { resolveSavedGraphScope } from './graphScopeSettings';

function applySavedPathFilters(graphData: IGraphData, patterns: readonly string[]): IGraphData {
  if (patterns.length === 0) return graphData;
  const nodes = graphData.nodes.filter((node) => {
    const graphPath = node.symbol?.filePath ?? node.id;
    return !matchesAnyPattern(graphPath, patterns);
  });
  const nodeIds = new Set(nodes.map(node => node.id));
  return {
    nodes,
    edges: graphData.edges.filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to)),
  };
}

function collectDirectoryPaths(filePaths: Iterable<string>): string[] {
  const directories = new Set<string>();
  for (const filePath of filePaths) {
    let directory = path.posix.dirname(filePath.replace(/\\/g, '/'));
    while (directory && directory !== '.') {
      directories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }
  return [...directories].sort();
}

export function readWorkspaceQueryGraph(
  workspaceRoot: string,
  installedPluginCache: CodeGraphyInstalledPluginCache,
) {
  const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
  const cache = loadWorkspaceAnalysisDatabaseCache(workspaceRoot);
  const snapshot = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
  const activity = createPluginActivityState({
    settings,
    installedPlugins: installedPluginCache.plugins,
    builtInPluginIds: [CODEGRAPHY_MARKDOWN_PLUGIN_ID],
  });
  const activePluginIds = new Set(activity.activePluginIds);
  const declarations = {
    nodes: snapshot.files.flatMap(file => file.analysis.nodeTypes ?? []),
    edges: snapshot.files.flatMap(file => file.analysis.edgeTypes ?? []),
  };
  const savedScope = resolveSavedGraphScope(settings, undefined, declarations);
  const fileAnalysis = new Map<string, IFileAnalysisResult>(
    Object.entries(cache.files).map(([filePath, entry]) => [filePath, entry.analysis]),
  );
  const graphData = applySavedPathFilters(buildWorkspaceGraphDataFromAnalysis({
    cacheFiles: cache.files,
    directoryPaths: collectDirectoryPaths(Object.keys(cache.files)),
    disabledPlugins: createDisabledPluginSet(settings),
    fileAnalysis: filterInactivePluginFileAnalysis(fileAnalysis, activePluginIds),
    getPluginForFile: () => undefined,
    nodeVisibility: savedScope.nodes,
    showOrphans: settings.showOrphans,
    workspaceRoot,
  }), settings.filterPatterns);

  return {
    graphData,
    scope: resolveSavedGraphScope(settings, graphData, declarations),
    settings,
    snapshotFacts: normalizeWorkspaceQueryFacts(
      filterInactivePluginSnapshotFacts(snapshot, activePluginIds),
      workspaceRoot,
    ),
  };
}
