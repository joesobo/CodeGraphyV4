import { readWorkspaceAnalysisDatabaseSnapshot } from '../graphCache/database/storage';
import { filterInactivePluginSnapshotFacts } from '../plugins/activityState/analysisFacts';
import { createPluginActivityState } from '../plugins/activityState/model';
import type { CodeGraphyInstalledPluginCache } from '../plugins/installedCache';
import { CODEGRAPHY_MARKDOWN_PLUGIN_ID, readCodeGraphyWorkspaceSettings } from './settings';
import { normalizeWorkspaceQueryFacts } from './queryFacts';
import { matchesAnyPattern } from '../discovery/pathMatching';
import type { IGraphData } from '../graph/contracts';
import { resolveProjectedGraphNodeTypes } from './graphScopeProjection/model';
import { resolveSavedGraphScope } from './graphScopeSettings';
import type { WorkspaceGraphQueryProjection } from './requestTypes';

function applyPathFilters(graphData: IGraphData, patterns: readonly string[]): IGraphData {
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

export function readWorkspaceQuerySource(
  workspaceRoot: string,
  installedPluginCache: CodeGraphyInstalledPluginCache,
) {
  const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
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

  return {
    declarations,
    graphData: snapshot.graph,
    settings,
    snapshotFacts: normalizeWorkspaceQueryFacts(
      filterInactivePluginSnapshotFacts(snapshot, activePluginIds),
      workspaceRoot,
    ),
  };
}

export function projectWorkspaceQueryGraph(
  source: ReturnType<typeof readWorkspaceQuerySource>,
  projection: WorkspaceGraphQueryProjection = {},
) {
  const disabledFilterPatterns = new Set(source.settings.disabledCustomFilterPatterns);
  const graphData = applyPathFilters(
    source.graphData,
    [
      ...source.settings.filterPatterns.filter(pattern => !disabledFilterPatterns.has(pattern)),
      ...(projection.filterPatterns ?? []),
    ],
  );
  const savedScope = resolveSavedGraphScope(source.settings, graphData, source.declarations);
  const scope = {
    nodes: projection.nodeTypes
      ? Object.fromEntries([
          ...Object.keys(savedScope.nodes).map(type => [type, false] as const),
          ...resolveProjectedGraphNodeTypes(projection.nodeTypes, source.declarations.nodes)
            .map(type => [type, true] as const),
        ])
      : savedScope.nodes,
    edges: projection.edgeTypes
      ? Object.fromEntries([
          ...Object.keys(savedScope.edges).map(type => [type, false] as const),
          ...projection.edgeTypes.map(type => [type, true] as const),
        ])
      : savedScope.edges,
  };

  return {
    graphData,
    nodeTypes: source.declarations.nodes,
    scope,
    settings: source.settings,
    snapshotFacts: source.snapshotFacts,
  };
}

export function readWorkspaceQueryGraph(
  workspaceRoot: string,
  installedPluginCache: CodeGraphyInstalledPluginCache,
  projection: WorkspaceGraphQueryProjection = {},
) {
  return projectWorkspaceQueryGraph(
    readWorkspaceQuerySource(workspaceRoot, installedPluginCache),
    projection,
  );
}
