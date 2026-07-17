import type {
  IAnalysisRelation,
  IFileAnalysisResult,
  IGraphData,
  IGraphEdge,
  IGraphEdgeSource,
  IGraphNode,
} from '@codegraphy-dev/plugin-api';
import { CORE_GRAPH_NODE_TYPES } from '../graphControls/defaults/definitions';
import { createGraphEdgeId } from './edgeIdentity';
import { buildWorkspaceGraphDataFromAnalysis, type IWorkspaceGraphAnalysisDataOptions } from './analysisData';
import { toRepoRelativeGraphPath } from './symbolPaths';

export type CompleteWorkspaceGraphDataOptions = Omit<IWorkspaceGraphAnalysisDataOptions, 'nodeVisibility'>;

const COMPLETE_SYMBOL_VISIBILITY = Object.fromEntries(
  CORE_GRAPH_NODE_TYPES.map(definition => [definition.id, true]),
);

function mergeGraphData(...graphs: readonly IGraphData[]): IGraphData {
  const nodes = new Map<string, IGraphNode>();
  const edges = new Map<string, IGraphEdge>();
  for (const graph of graphs) {
    for (const node of graph.nodes) nodes.set(node.id, node);
    for (const edge of graph.edges) {
      const existing = edges.get(edge.id);
      if (!existing) {
        edges.set(edge.id, edge);
        continue;
      }
      const sources = new Map(existing.sources.map(source => [source.id, source]));
      for (const source of edge.sources) sources.set(source.id, source);
      edges.set(edge.id, { ...existing, sources: [...sources.values()] });
    }
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

function normalizeGraphId(id: string, workspaceRoot: string): string {
  const normalized = id.replace(/\\/g, '/');
  const normalizedRoot = workspaceRoot.replace(/\\/g, '/').replace(/\/$/, '');
  return normalized.startsWith(`${normalizedRoot}/`)
    ? normalized.slice(normalizedRoot.length + 1)
    : normalized;
}

function buildAnalysisNodes(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
): IGraphNode[] {
  const colorByType = new Map(
    [...fileAnalysis.values()]
      .flatMap(analysis => analysis.nodeTypes ?? [])
      .map(type => [type.id, type.defaultColor]),
  );
  return [...fileAnalysis.values()].flatMap(analysis => (analysis.nodes ?? []).map(node => ({
    id: normalizeGraphId(node.id, workspaceRoot),
    label: node.label,
    nodeType: node.nodeType,
    color: colorByType.get(node.nodeType) ?? '#808080',
    metadata: {
      ...node.metadata,
      ...(node.filePath ? { filePath: toRepoRelativeGraphPath(node.filePath, workspaceRoot) } : {}),
      ...(node.parentId ? { parentId: normalizeGraphId(node.parentId, workspaceRoot) } : {}),
    },
  })));
}

function relationEndpoint(
  relation: IAnalysisRelation,
  side: 'from' | 'to',
  workspaceRoot: string,
): string | undefined {
  if (side === 'from') {
    return normalizeGraphId(
      relation.fromNodeId ?? relation.fromSymbolId ?? relation.fromFilePath,
      workspaceRoot,
    );
  }
  const target = relation.toNodeId
    ?? relation.toSymbolId
    ?? relation.resolvedPath
    ?? relation.toFilePath
    ?? undefined;
  return target ? normalizeGraphId(target, workspaceRoot) : undefined;
}

function createRelationSource(relation: IAnalysisRelation): IGraphEdgeSource {
  const pluginId = relation.pluginId ?? 'codegraphy.core';
  return {
    id: `${pluginId}:${relation.sourceId}`,
    pluginId,
    sourceId: relation.sourceId,
    label: relation.sourceId,
    ...(relation.variant ? { variant: relation.variant } : {}),
    ...(relation.metadata ? { metadata: relation.metadata } : {}),
  };
}

function buildAnalysisNodeEdges(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
): IGraphEdge[] {
  return [...fileAnalysis.values()].flatMap(analysis => (analysis.relations ?? []).flatMap(relation => {
    if (!relation.fromNodeId && !relation.toNodeId) return [];
    const from = relationEndpoint(relation, 'from', workspaceRoot);
    const to = relationEndpoint(relation, 'to', workspaceRoot);
    if (!from || !to) return [];
    return [{
      id: createGraphEdgeId({
        from,
        to,
        kind: relation.kind,
        type: relation.type,
        variant: relation.variant,
      }),
      from,
      to,
      kind: relation.kind,
      sources: [createRelationSource(relation)],
      ...(relation.metadata ? { metadata: relation.metadata } : {}),
    }];
  }));
}

export function buildCompleteWorkspaceGraphData(
  options: CompleteWorkspaceGraphDataOptions,
): IGraphData {
  const symbolGraph = buildWorkspaceGraphDataFromAnalysis({
    ...options,
    nodeVisibility: COMPLETE_SYMBOL_VISIBILITY,
  });
  const analysisGraph = {
    nodes: buildAnalysisNodes(options.fileAnalysis, options.workspaceRoot),
    edges: buildAnalysisNodeEdges(options.fileAnalysis, options.workspaceRoot),
  };
  return mergeGraphData(symbolGraph, analysisGraph);
}
