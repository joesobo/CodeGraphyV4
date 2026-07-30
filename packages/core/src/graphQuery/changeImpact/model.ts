import type { GraphEdgeKind, IGraphEdge, IGraphNode } from '../../graph/contracts';
import {
  collectWorkspacePackageRoots,
  getNearestWorkspacePackageRoot,
} from '../../graphControls/packages/roots';
import { getNodeType } from '../../visibleGraph/model';
import type { GraphQueryData } from '../data';
import { resolveSelectorNodeIds } from '../fileEndpoints';
import type {
  GraphQueryChangeImpactAffectedFile,
  GraphQueryChangeImpactConfig,
  GraphQueryChangeImpactEvidence,
  GraphQueryChangeImpactPackageBoundary,
  GraphQueryChangeImpactRelationship,
  GraphQueryChangeImpactReport,
  GraphQueryChangeImpactTarget,
  GraphQueryRelationshipSymbol,
} from '../model';

const DEFAULT_AFFECTED_FILES = 20;
const MAX_AFFECTED_FILES = 100;
const DEFAULT_MAX_DEPTH = 3;
const MAX_MAX_DEPTH = 10;
const MAX_VISITED_NODES = 2_000;
const RANKING_METHOD = 'shortest incoming typed Relationship path, then source before test, then path';
const TEST_PATH_PATTERN = /(?:^|\/)(?:__tests__|tests?)(?:\/|\.)|\.(?:spec|test)\.[^/]+$/iu;

interface ImpactPath {
  nodes: string[];
  relationships: GraphQueryChangeImpactRelationship[];
}

interface ImpactTraversal {
  paths: ReadonlyMap<string, ImpactPath>;
  depthTruncated: boolean;
  visitedTruncated: boolean;
}

function normalizeInteger(value: number | undefined, fallback: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || (value ?? 0) <= 0) return fallback;
  return Math.min(value ?? fallback, maximum);
}

function nodeFilePath(node: IGraphNode | undefined): string | undefined {
  if (!node) return undefined;
  if (node.symbol?.filePath) return node.symbol.filePath;
  return getNodeType(node) === 'file' ? node.id : undefined;
}

function resolveTarget(
  data: GraphQueryData,
  selector: string,
): GraphQueryChangeImpactTarget | undefined {
  const node = data.graphData.nodes.find(candidate => candidate.id === selector);
  if (node) {
    const filePath = nodeFilePath(node);
    if (!filePath) return undefined;
    return {
      path: node.id,
      nodeType: getNodeType(node),
      filePath,
      ...(node.symbol ? { symbol: node.symbol } : {}),
    };
  }
  const symbol = data.symbols?.find(candidate => candidate.id === selector);
  return symbol ? {
    path: symbol.id,
    nodeType: `symbol:${symbol.kind}`,
    filePath: symbol.filePath,
    symbol: {
      id: symbol.id,
      filePath: symbol.filePath,
      name: symbol.name,
      kind: symbol.kind,
      ...(symbol.signature ? { signature: symbol.signature } : {}),
      ...(symbol.range ? { range: symbol.range } : {}),
    },
  } : undefined;
}

function relationship(edge: IGraphEdge): GraphQueryChangeImpactRelationship {
  return { from: edge.from, to: edge.to, edgeType: edge.kind };
}

function incomingEdges(graphEdges: readonly IGraphEdge[]): Map<string, IGraphEdge[]> {
  const incoming = new Map<string, IGraphEdge[]>();
  for (const edge of graphEdges) {
    if (edge.kind === 'nests') continue;
    const edges = incoming.get(edge.to) ?? [];
    edges.push(edge);
    incoming.set(edge.to, edges);
  }
  for (const edges of incoming.values()) {
    edges.sort((left, right) => (
      left.from.localeCompare(right.from)
      || left.kind.localeCompare(right.kind)
      || left.to.localeCompare(right.to)
    ));
  }
  return incoming;
}

function collectIncomingPaths(
  data: GraphQueryData,
  startIds: readonly string[],
  maxDepth: number,
): ImpactTraversal {
  const incoming = incomingEdges(data.graphData.edges);
  const paths = new Map<string, ImpactPath>();
  const queue: string[] = [];
  for (const startId of [...new Set(startIds)].sort()) {
    paths.set(startId, { nodes: [startId], relationships: [] });
    queue.push(startId);
  }
  let depthTruncated = false;
  let visitedTruncated = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentPath = paths.get(current)!;
    const depth = currentPath.relationships.length;
    const candidates = incoming.get(current) ?? [];
    if (depth >= maxDepth) {
      depthTruncated ||= candidates.some(edge => !paths.has(edge.from));
      continue;
    }
    for (const edge of candidates) {
      if (paths.has(edge.from)) continue;
      if (paths.size >= MAX_VISITED_NODES) {
        visitedTruncated = true;
        continue;
      }
      paths.set(edge.from, {
        nodes: [edge.from, ...currentPath.nodes],
        relationships: [relationship(edge), ...currentPath.relationships],
      });
      queue.push(edge.from);
    }
  }

  return { paths, depthTruncated, visitedTruncated };
}

function reportSymbol(node: IGraphNode): GraphQueryRelationshipSymbol | undefined {
  if (!node.symbol) return undefined;
  return {
    id: node.symbol.id,
    filePath: node.symbol.filePath,
    name: node.symbol.name,
    kind: node.symbol.kind,
    ...(node.symbol.signature ? { signature: node.symbol.signature } : {}),
    ...(node.symbol.range ? { range: node.symbol.range } : {}),
  };
}

function pathComparison(left: ImpactPath, right: ImpactPath): number {
  return left.relationships.length - right.relationships.length
    || left.nodes.join('\0').localeCompare(right.nodes.join('\0'));
}

function affectedFileComparison(
  left: GraphQueryChangeImpactAffectedFile,
  right: GraphQueryChangeImpactAffectedFile,
): number {
  return left.distance - right.distance
    || Number(left.category === 'test') - Number(right.category === 'test')
    || left.path.localeCompare(right.path);
}

function collectAffectedFiles(
  data: GraphQueryData,
  traversal: ImpactTraversal,
  targetFilePaths: ReadonlySet<string>,
): GraphQueryChangeImpactAffectedFile[] {
  const nodes = new Map(data.graphData.nodes.map(node => [node.id, node]));
  const affected = new Map<string, GraphQueryChangeImpactAffectedFile>();
  for (const [nodeId, path] of traversal.paths) {
    const node = nodes.get(nodeId);
    const filePath = nodeFilePath(node);
    if (!node || !filePath || targetFilePaths.has(filePath)) continue;
    const existing = affected.get(filePath);
    const symbol = reportSymbol(node);
    if (!existing || pathComparison(path, existing.evidence) < 0) {
      affected.set(filePath, {
        path: filePath,
        category: TEST_PATH_PATTERN.test(filePath) ? 'test' : 'source',
        distance: path.relationships.length,
        symbols: symbol ? [symbol] : [],
        evidence: path,
      });
      continue;
    }
    if (symbol && !existing.symbols.some(candidate => candidate.id === symbol.id)) {
      existing.symbols.push(symbol);
      existing.symbols.sort((left, right) => (
        left.name.localeCompare(right.name)
        || (left.id ?? '').localeCompare(right.id ?? '')
      ));
    }
  }
  return [...affected.values()].sort(affectedFileComparison);
}

function relationshipFilePath(
  relationship_: GraphQueryChangeImpactRelationship,
  side: 'from' | 'to',
  nodes: ReadonlyMap<string, IGraphNode>,
): string | undefined {
  return nodeFilePath(nodes.get(relationship_[side]));
}

function boundaryKey(boundary: GraphQueryChangeImpactPackageBoundary): string {
  return `${boundary.from}\0${boundary.to}`;
}

function collectBoundaries(
  data: GraphQueryData,
  affected: readonly GraphQueryChangeImpactAffectedFile[],
): GraphQueryChangeImpactReport['boundaries'] {
  const nodes = new Map(data.graphData.nodes.map(node => [node.id, node]));
  const packageRoots = collectWorkspacePackageRoots(data.graphData.nodes);
  const packages = new Map<string, GraphQueryChangeImpactPackageBoundary>();
  const publicRelationships = new Map<string, GraphQueryChangeImpactRelationship>();
  for (const file of affected) {
    for (const relationship_ of file.evidence.relationships) {
      if (relationship_.edgeType === 'reexport') {
        publicRelationships.set(
          `${relationship_.from}\0${relationship_.to}\0${relationship_.edgeType}`,
          relationship_,
        );
      }
      const fromPath = relationshipFilePath(relationship_, 'from', nodes);
      const toPath = relationshipFilePath(relationship_, 'to', nodes);
      if (!fromPath || !toPath) continue;
      const boundary = {
        from: getNearestWorkspacePackageRoot(fromPath, packageRoots),
        to: getNearestWorkspacePackageRoot(toPath, packageRoots),
      };
      if (!boundary.from || !boundary.to || boundary.from === boundary.to) continue;
      const concreteBoundary = { from: boundary.from, to: boundary.to };
      packages.set(boundaryKey(concreteBoundary), concreteBoundary);
    }
  }
  return {
    packages: [...packages.values()].sort((left, right) => (
      left.from.localeCompare(right.from) || left.to.localeCompare(right.to)
    )),
    public: [...publicRelationships.values()].sort((left, right) => (
      left.from.localeCompare(right.from) || left.to.localeCompare(right.to)
    )),
  };
}

function baseReport(
  data: GraphQueryData,
  targets: GraphQueryChangeImpactTarget[],
  maxDepth: number,
  limit: number,
): Omit<GraphQueryChangeImpactReport, 'affected' | 'boundaries' | 'limits' | 'tests'> {
  return {
    targets,
    sources: {
      graph: {
        freshness: 'cached',
        cacheState: data.cacheState ?? 'fresh',
      },
      ranking: { method: RANKING_METHOD },
    },
  };
}

export function analyzeGraphChangeImpact(
  data: GraphQueryData,
  config: GraphQueryChangeImpactConfig,
): GraphQueryChangeImpactReport {
  const targetSelectors = [...new Set(config.targets.filter(target => typeof target === 'string'))];
  const targets = targetSelectors.flatMap(selector => {
    const target = resolveTarget(data, selector);
    return target ? [target] : [];
  });
  const missingTargets = targetSelectors.filter(selector => !targets.some(target => target.path === selector));
  const maxDepth = normalizeInteger(config.maxDepth, DEFAULT_MAX_DEPTH, MAX_MAX_DEPTH);
  const limit = normalizeInteger(config.limit, DEFAULT_AFFECTED_FILES, MAX_AFFECTED_FILES);
  const base = baseReport(data, targets, maxDepth, limit);
  if (targetSelectors.length === 0 || missingTargets.length > 0) {
    const missing = targetSelectors.length === 0 ? ['<target>'] : missingTargets;
    return {
      ...base,
      affected: [],
      tests: [],
      boundaries: { packages: [], public: [] },
      limits: {
        maxDepth,
        affectedFiles: limit,
        visitedNodes: MAX_VISITED_NODES,
        complete: true,
        truncationReasons: [],
      },
      error: 'change_impact_target_not_found',
      message: `No indexed File or exact Symbol has the id: ${missing.join(', ')}`,
      missingTargets: missing,
    };
  }

  const startIds = targets.flatMap(target => (
    getNodeType(data.graphData.nodes.find(node => node.id === target.path) ?? {
      id: target.path,
      label: target.path,
      nodeType: target.nodeType,
    }) === 'file'
      ? resolveSelectorNodeIds(data.graphData, target.path, true)
      : [target.path]
  ));
  const traversal = collectIncomingPaths(data, startIds, maxDepth);
  const allAffected = collectAffectedFiles(
    data,
    traversal,
    new Set(targets.map(target => target.filePath)),
  );
  const affected = allAffected.slice(0, limit);
  const truncationReasons: GraphQueryChangeImpactReport['limits']['truncationReasons'] = [];
  if (allAffected.length > limit) truncationReasons.push('affected-files');
  if (traversal.depthTruncated) truncationReasons.push('max-depth');
  if (traversal.visitedTruncated) truncationReasons.push('visited-nodes');

  return {
    ...base,
    affected,
    tests: affected
      .filter(file => file.category === 'test')
      .map(file => ({ path: file.path, distance: file.distance, evidence: file.evidence })),
    boundaries: collectBoundaries(data, affected),
    limits: {
      maxDepth,
      affectedFiles: limit,
      visitedNodes: MAX_VISITED_NODES,
      complete: truncationReasons.length === 0,
      truncationReasons,
    },
  };
}
