import type {
  GraphEdgeKind,
  IGraphData,
  IGraphEdge,
  IGraphEdgeSource,
  IGraphNode,
  NodeType,
} from '@codegraphy-dev/plugin-api';

import { hashGraphFixture } from '../fixture/hash';

interface ExportNode {
  id: string;
  label: string;
  nodeType?: string;
  color: string;
  symbol?: IGraphNode['symbol'];
  fileSize?: number;
  churn?: number;
}

interface ExportEdgeSource extends IGraphEdgeSource {
  pluginName?: string;
}

interface ExportEdge {
  id: string;
  from: string;
  to: string;
  kind: string;
  color?: string;
  sources: ExportEdgeSource[];
}

export interface CodeGraphyExportDocument {
  format: 'codegraphy-export';
  version: string;
  exportedAt: string;
  nodes: ExportNode[];
  edges: ExportEdge[];
  summary?: unknown;
  legend?: unknown;
  scope?: unknown;
}

export interface RealFixtureSource {
  name: string;
  repositoryUrl: string;
  revision: string;
  license: string;
}

export interface RealBenchmarkFixture {
  schemaVersion: 1;
  source: RealFixtureSource & {
    kind: 'codegraphy-export';
    exportVersion: string;
  };
  graph: IGraphData;
  summary: {
    nodeCount: number;
    edgeCount: number;
  };
  fixtureHash: string;
}

function normalizeNode(node: ExportNode): IGraphNode {
  return {
    id: node.id,
    label: node.label,
    nodeType: (node.nodeType ?? 'file') as NodeType,
    color: node.color,
    ...(node.symbol === undefined ? {} : { symbol: node.symbol }),
    ...(node.fileSize === undefined ? {} : { fileSize: node.fileSize }),
    ...(node.churn === undefined ? {} : { churn: node.churn }),
  };
}

function normalizeSource(source: ExportEdgeSource): IGraphEdgeSource {
  return {
    id: source.id,
    pluginId: source.pluginId,
    sourceId: source.sourceId,
    label: source.label,
    ...(source.variant === undefined ? {} : { variant: source.variant }),
    ...(source.metadata === undefined ? {} : { metadata: source.metadata }),
  };
}

function normalizeEdge(edge: ExportEdge): IGraphEdge {
  return {
    id: edge.id,
    from: edge.from,
    to: edge.to,
    kind: edge.kind as GraphEdgeKind,
    ...(edge.color === undefined ? {} : { color: edge.color }),
    sources: edge.sources
      .map(normalizeSource)
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
}

function assertUniqueIds(ids: readonly string[], label: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new Error(`CodeGraphy export contains duplicate ${label} ids`);
  }
}

function assertValidEndpoints(graph: IGraphData): void {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const invalidEdge = graph.edges.find(
    (edge) => !nodeIds.has(edge.from) || !nodeIds.has(edge.to),
  );
  if (invalidEdge) {
    throw new Error(`CodeGraphy export edge has a missing endpoint: ${invalidEdge.id}`);
  }
}

export function normalizeCodeGraphyExport(
  document: CodeGraphyExportDocument,
  source: RealFixtureSource,
): RealBenchmarkFixture {
  const graph: IGraphData = {
    nodes: document.nodes
      .map(normalizeNode)
      .sort((left, right) => left.id.localeCompare(right.id)),
    edges: document.edges
      .map(normalizeEdge)
      .sort((left, right) => left.id.localeCompare(right.id)),
  };

  assertUniqueIds(graph.nodes.map((node) => node.id), 'node');
  assertUniqueIds(graph.edges.map((edge) => edge.id), 'edge');
  assertValidEndpoints(graph);

  return {
    schemaVersion: 1,
    source: {
      kind: 'codegraphy-export',
      ...source,
      exportVersion: document.version,
    },
    graph,
    summary: {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
    },
    fixtureHash: hashGraphFixture(graph),
  };
}
