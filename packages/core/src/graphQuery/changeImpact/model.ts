import type { IGraphNode } from '../../graph/contracts';
import {
  collectWorkspacePackageRoots,
  getNearestWorkspacePackageRoot,
} from '../../graphControls/packages/roots';
import { getNodeType } from '../../visibleGraph/model';
import type { GraphQueryData } from '../data';
import { resolveSelectorNodeIds } from '../fileEndpoints';
import {
  collectIncomingDirectedPathResult,
  type IncomingDirectedPath,
  type IncomingDirectedPathResult,
} from '../pathTraversal';
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

function normalizeInteger(value: number | undefined, fallback: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || (value ?? 0) <= 0) return fallback;
  return Math.min(value ?? fallback, maximum);
}

function nodeFilePath(node: IGraphNode | undefined): string | undefined {
  if (!node) return undefined;
  if (node.symbol?.filePath) return node.symbol.filePath;
  return getNodeType(node) === 'file' ? node.id : undefined;
}

function graphNodeTarget(node: IGraphNode): GraphQueryChangeImpactTarget | undefined {
  const filePath = nodeFilePath(node);
  if (!filePath) return undefined;
  return {
    path: node.id,
    nodeType: getNodeType(node),
    filePath,
    ...(node.symbol ? { symbol: node.symbol } : {}),
  };
}

function analysisSymbolTarget(
  symbol: NonNullable<GraphQueryData['symbols']>[number],
): GraphQueryChangeImpactTarget {
  return {
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
  };
}

function resolveTarget(
  data: GraphQueryData,
  selector: string,
): GraphQueryChangeImpactTarget | undefined {
  const node = data.graphData.nodes.find(candidate => candidate.id === selector);
  if (node) return graphNodeTarget(node);
  const symbol = data.symbols?.find(candidate => candidate.id === selector);
  return symbol ? analysisSymbolTarget(symbol) : undefined;
}

function relationship(
  edge: IncomingDirectedPath['edges'][number],
): GraphQueryChangeImpactRelationship {
  return { from: edge.from, to: edge.to, edgeType: edge.kind };
}

function collectIncomingPaths(
  data: GraphQueryData,
  startIds: readonly string[],
  maxDepth: number,
): IncomingDirectedPathResult {
  return collectIncomingDirectedPathResult(
    {
      nodes: data.graphData.nodes,
      edges: data.graphData.edges.filter(edge => edge.kind !== 'nests'),
    },
    startIds,
    maxDepth,
    MAX_VISITED_NODES,
  );
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

function pathEvidence(path: IncomingDirectedPath): GraphQueryChangeImpactEvidence {
  return {
    nodes: path.nodes,
    relationships: path.edges.map(relationship),
  };
}

function pathComparison(left: IncomingDirectedPath, right: GraphQueryChangeImpactEvidence): number {
  return left.edges.length - right.relationships.length
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

function symbolComparison(
  left: GraphQueryRelationshipSymbol,
  right: GraphQueryRelationshipSymbol,
): number {
  return left.name.localeCompare(right.name)
    || (left.id ?? '').localeCompare(right.id ?? '');
}

function createAffectedFile(
  filePath: string,
  node: IGraphNode,
  path: IncomingDirectedPath,
): GraphQueryChangeImpactAffectedFile {
  const symbol = reportSymbol(node);
  return {
    path: filePath,
    category: TEST_PATH_PATTERN.test(filePath) ? 'test' : 'source',
    distance: path.edges.length,
    symbols: symbol ? [symbol] : [],
    evidence: pathEvidence(path),
  };
}

function appendAffectedSymbol(
  affected: GraphQueryChangeImpactAffectedFile,
  node: IGraphNode,
): void {
  const symbol = reportSymbol(node);
  if (!symbol || affected.symbols.some(candidate => candidate.id === symbol.id)) return;
  affected.symbols.push(symbol);
  affected.symbols.sort(symbolComparison);
}

function collectAffectedPath(
  affected: Map<string, GraphQueryChangeImpactAffectedFile>,
  node: IGraphNode | undefined,
  path: IncomingDirectedPath,
  targetFilePaths: ReadonlySet<string>,
): void {
  const filePath = nodeFilePath(node);
  if (!node || !filePath || targetFilePaths.has(filePath)) return;
  const existing = affected.get(filePath);
  if (!existing || pathComparison(path, existing.evidence) < 0) {
    affected.set(filePath, createAffectedFile(filePath, node, path));
    return;
  }
  appendAffectedSymbol(existing, node);
}

function collectAffectedFiles(
  data: GraphQueryData,
  traversal: IncomingDirectedPathResult,
  targetFilePaths: ReadonlySet<string>,
): GraphQueryChangeImpactAffectedFile[] {
  const nodes = new Map(data.graphData.nodes.map(node => [node.id, node]));
  const affected = new Map<string, GraphQueryChangeImpactAffectedFile>();
  for (const [nodeId, path] of traversal.paths) {
    collectAffectedPath(affected, nodes.get(nodeId), path, targetFilePaths);
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

function packageBoundary(
  relationship_: GraphQueryChangeImpactRelationship,
  nodes: ReadonlyMap<string, IGraphNode>,
  packageRoots: ReadonlySet<string>,
): GraphQueryChangeImpactPackageBoundary | undefined {
  const fromPath = relationshipFilePath(relationship_, 'from', nodes);
  const toPath = relationshipFilePath(relationship_, 'to', nodes);
  if (!fromPath || !toPath) return undefined;
  const from = getNearestWorkspacePackageRoot(fromPath, packageRoots);
  const to = getNearestWorkspacePackageRoot(toPath, packageRoots);
  return from && to && from !== to ? { from, to } : undefined;
}

function collectBoundaryRelationship(
  relationship_: GraphQueryChangeImpactRelationship,
  nodes: ReadonlyMap<string, IGraphNode>,
  packageRoots: ReadonlySet<string>,
  packages: Map<string, GraphQueryChangeImpactPackageBoundary>,
  publicRelationships: Map<string, GraphQueryChangeImpactRelationship>,
): void {
  if (relationship_.edgeType === 'reexport') {
    publicRelationships.set(
      `${relationship_.from}\0${relationship_.to}\0${relationship_.edgeType}`,
      relationship_,
    );
  }
  const boundary = packageBoundary(relationship_, nodes, packageRoots);
  if (boundary) packages.set(boundaryKey(boundary), boundary);
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
      collectBoundaryRelationship(
        relationship_,
        nodes,
        packageRoots,
        packages,
        publicRelationships,
      );
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

function collectTargets(
  data: GraphQueryData,
  selectors: readonly string[],
): GraphQueryChangeImpactTarget[] {
  return selectors.flatMap(selector => {
    const target = resolveTarget(data, selector);
    return target ? [target] : [];
  });
}

function targetStartIds(
  data: GraphQueryData,
  targets: readonly GraphQueryChangeImpactTarget[],
): string[] {
  const nodes = new Map(data.graphData.nodes.map(node => [node.id, node]));
  return targets.flatMap(target => (
    getNodeType(nodes.get(target.path) ?? {
      id: target.path,
      label: target.path,
      nodeType: target.nodeType,
    }) === 'file'
      ? resolveSelectorNodeIds(data.graphData, target.path, true)
      : [target.path]
  ));
}

function truncationReasons(
  affectedFileCount: number,
  affectedFileLimit: number,
  traversal: IncomingDirectedPathResult,
): GraphQueryChangeImpactReport['limits']['truncationReasons'] {
  const reasons: GraphQueryChangeImpactReport['limits']['truncationReasons'] = [];
  if (affectedFileCount > affectedFileLimit) reasons.push('affected-files');
  if (traversal.depthTruncated) reasons.push('max-depth');
  if (traversal.visitedTruncated) reasons.push('visited-nodes');
  return reasons;
}

function targetNotFoundReport(
  base: ReturnType<typeof baseReport>,
  missing: string[],
  maxDepth: number,
  limit: number,
): GraphQueryChangeImpactReport {
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

function baseReport(
  data: GraphQueryData,
  targets: GraphQueryChangeImpactTarget[],
): Omit<GraphQueryChangeImpactReport, 'affected' | 'boundaries' | 'limits' | 'tests'> {
  return {
    targets,
    sources: {
      graph: {
        freshness: 'cached',
        cacheState: data.cacheState ?? 'fresh',
      },
      ranking: { method: RANKING_METHOD },
      heuristics: {
        tests: 'File path uses a tests directory or .test/.spec suffix',
        publicBoundaries: 'reexport Relationships only',
        packageBoundaries: 'nearest indexed package.json roots differ',
      },
    },
  };
}

export function analyzeGraphChangeImpact(
  data: GraphQueryData,
  config: GraphQueryChangeImpactConfig,
): GraphQueryChangeImpactReport {
  const targetSelectors = [...new Set(config.targets.filter(target => typeof target === 'string'))];
  const targets = collectTargets(data, targetSelectors);
  const missingTargets = targetSelectors.filter(selector => !targets.some(target => target.path === selector));
  const maxDepth = normalizeInteger(config.maxDepth, DEFAULT_MAX_DEPTH, MAX_MAX_DEPTH);
  const limit = normalizeInteger(config.limit, DEFAULT_AFFECTED_FILES, MAX_AFFECTED_FILES);
  const base = baseReport(data, targets);
  if (targetSelectors.length === 0 || missingTargets.length > 0) {
    const missing = targetSelectors.length === 0 ? ['<target>'] : missingTargets;
    return targetNotFoundReport(base, missing, maxDepth, limit);
  }

  const startIds = targetStartIds(data, targets);
  const traversal = collectIncomingPaths(data, startIds, maxDepth);
  const allAffected = collectAffectedFiles(
    data,
    traversal,
    new Set(targets.map(target => target.filePath)),
  );
  const affected = allAffected.slice(0, limit);
  const reasons = truncationReasons(allAffected.length, limit, traversal);

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
      complete: reasons.length === 0,
      truncationReasons: reasons,
    },
  };
}
