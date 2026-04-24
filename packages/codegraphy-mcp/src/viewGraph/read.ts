import { filterRelations } from '../query/indexes';
import type { QueryContext } from '../query/model';
import type { ViewGraphEdge, ViewGraphNode, ViewGraphOptions, ViewGraphResult } from './model';
import { readViewGraphSettings } from './settings';

const STRUCTURAL_NESTS_EDGE_KIND = 'codegraphy:nests';
const PACKAGE_NODE_ID_PREFIX = 'pkg:workspace:';

interface FileGraphState {
  nodes: ViewGraphNode[];
  edges: ViewGraphEdge[];
}

function createFileNode(filePath: string, depthLevel?: number): ViewGraphNode {
  return {
    id: filePath,
    label: filePath.split('/').at(-1) ?? filePath,
    nodeType: 'file',
    depthLevel,
  };
}

function buildFileEdges(
  context: QueryContext,
  options: ViewGraphOptions,
): ViewGraphEdge[] {
  const grouped = new Map<string, ViewGraphEdge>();
  const relations = filterRelations(context.relations, {
    kinds: options.kinds,
    maxResults: options.maxResults,
  });

  for (const relation of relations) {
    if (!relation.toFilePath) {
      continue;
    }

    const key = `${relation.fromFilePath}->${relation.toFilePath}#${relation.kind}`;
    const current = grouped.get(key);
    if (current) {
      current.supportCount += 1;
      continue;
    }

    grouped.set(key, {
      id: key,
      from: relation.fromFilePath,
      to: relation.toFilePath,
      kind: relation.kind,
      supportCount: 1,
      structural: false,
    });
  }

  return [...grouped.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function filterOrphans(nodes: ViewGraphNode[], edges: ViewGraphEdge[]): ViewGraphNode[] {
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.from);
    connectedIds.add(edge.to);
  }

  return nodes.filter((node) => connectedIds.has(node.id));
}

function resolveFocusFile(focus: string | undefined, context: QueryContext): string | undefined {
  if (!focus) {
    return undefined;
  }

  if (focus.startsWith('symbol:')) {
    return context.symbols.get(focus)?.filePath;
  }

  return focus;
}

function collectDepthLevels(
  focusFile: string,
  edges: ViewGraphEdge[],
  maxDepth: number,
): Map<string, number> {
  const adjacency = new Map<string, Set<string>>();

  for (const edge of edges) {
    const fromNeighbors = adjacency.get(edge.from) ?? new Set<string>();
    fromNeighbors.add(edge.to);
    adjacency.set(edge.from, fromNeighbors);

    const toNeighbors = adjacency.get(edge.to) ?? new Set<string>();
    toNeighbors.add(edge.from);
    adjacency.set(edge.to, toNeighbors);
  }

  const depths = new Map<string, number>([[focusFile, 0]]);
  const queue: Array<{ id: string; depth: number }> = [{ id: focusFile, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= maxDepth) {
      continue;
    }

    for (const neighbor of adjacency.get(current.id) ?? []) {
      if (depths.has(neighbor)) {
        continue;
      }

      const depth = current.depth + 1;
      depths.set(neighbor, depth);
      queue.push({ id: neighbor, depth });
    }
  }

  return depths;
}

function applyDepthMode(
  nodes: ViewGraphNode[],
  edges: ViewGraphEdge[],
  focusFile: string | undefined,
  depthLimit: number,
): FileGraphState {
  if (!focusFile) {
    return { nodes, edges };
  }

  const depths = collectDepthLevels(focusFile, edges, depthLimit);
  if (!depths.has(focusFile)) {
    return { nodes, edges };
  }

  const included = new Set(depths.keys());
  return {
    nodes: nodes
      .filter((node) => included.has(node.id))
      .map((node) => ({ ...node, depthLevel: depths.get(node.id) })),
    edges: edges.filter((edge) => included.has(edge.from) && included.has(edge.to)),
  };
}

function limitFileNodes(
  nodes: ViewGraphNode[],
  edges: ViewGraphEdge[],
  focusFile: string | undefined,
  maxResults: number | undefined,
): FileGraphState {
  if (!maxResults || nodes.length <= maxResults) {
    return { nodes, edges };
  }

  const ranked = [...nodes].sort((left, right) => {
    if (left.id === focusFile) {
      return -1;
    }
    if (right.id === focusFile) {
      return 1;
    }

    const leftDepth = left.depthLevel ?? Number.MAX_SAFE_INTEGER;
    const rightDepth = right.depthLevel ?? Number.MAX_SAFE_INTEGER;
    if (leftDepth !== rightDepth) {
      return leftDepth - rightDepth;
    }

    return left.id.localeCompare(right.id);
  });
  const visibleIds = new Set(ranked.slice(0, maxResults).map((node) => node.id));

  return {
    nodes: ranked.filter((node) => visibleIds.has(node.id)),
    edges: edges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to)),
  };
}

function collectFolderPaths(fileNodes: ViewGraphNode[]): Set<string> {
  const folderPaths = new Set<string>();

  for (const node of fileNodes) {
    const segments = node.id.split('/');
    for (let index = 1; index < segments.length; index += 1) {
      folderPaths.add(segments.slice(0, index).join('/'));
    }
  }

  if (fileNodes.some((node) => !node.id.includes('/'))) {
    folderPaths.add('(root)');
  }

  return folderPaths;
}

function createFolderNodes(folderPaths: Set<string>): ViewGraphNode[] {
  return [...folderPaths]
    .sort((left, right) => left.localeCompare(right))
    .map((folderPath) => ({
      id: folderPath,
      label: folderPath.split('/').pop() ?? folderPath,
      nodeType: 'folder' as const,
    }));
}

function createFolderEdges(folderPaths: Set<string>, fileNodes: ViewGraphNode[]): ViewGraphEdge[] {
  const edges: ViewGraphEdge[] = [];

  for (const folderPath of folderPaths) {
    if (folderPath === '(root)') {
      continue;
    }

    const segments = folderPath.split('/');
    const parent = segments.length <= 1 ? '(root)' : segments.slice(0, -1).join('/');
    edges.push({
      id: `${parent}->${folderPath}#${STRUCTURAL_NESTS_EDGE_KIND}`,
      from: parent,
      to: folderPath,
      kind: STRUCTURAL_NESTS_EDGE_KIND,
      supportCount: 1,
      structural: true,
    });
  }

  for (const node of fileNodes) {
    const segments = node.id.split('/');
    const parent = segments.length === 1 ? '(root)' : segments.slice(0, -1).join('/');
    edges.push({
      id: `${parent}->${node.id}#${STRUCTURAL_NESTS_EDGE_KIND}`,
      from: parent,
      to: node.id,
      kind: STRUCTURAL_NESTS_EDGE_KIND,
      supportCount: 1,
      structural: true,
    });
  }

  return edges;
}

function isPackageManifestPath(filePath: string): boolean {
  return filePath === 'package.json' || filePath.endsWith('/package.json');
}

function getWorkspacePackageRoot(filePath: string): string {
  return filePath === 'package.json'
    ? '.'
    : filePath.slice(0, -'/package.json'.length);
}

function getPackageNodeId(packageRoot: string): string {
  return `${PACKAGE_NODE_ID_PREFIX}${packageRoot}`;
}

function getPackageLabel(packageRoot: string): string {
  if (packageRoot === '.') {
    return 'workspace';
  }

  return packageRoot.split('/').pop() ?? packageRoot;
}

function collectPackageRoots(filePaths: Iterable<string>): Set<string> {
  const packageRoots = new Set<string>();

  for (const filePath of filePaths) {
    if (isPackageManifestPath(filePath)) {
      packageRoots.add(getWorkspacePackageRoot(filePath));
    }
  }

  return packageRoots;
}

function findNearestPackageRoot(filePath: string, packageRoots: Set<string>): string | undefined {
  let bestMatch: string | undefined;

  for (const packageRoot of packageRoots) {
    if (packageRoot === '.') {
      bestMatch ??= packageRoot;
      continue;
    }

    if (filePath === packageRoot || filePath.startsWith(`${packageRoot}/`)) {
      if (!bestMatch || packageRoot.length > bestMatch.length) {
        bestMatch = packageRoot;
      }
    }
  }

  return bestMatch;
}

function createPackageNodes(packageRoots: Set<string>): ViewGraphNode[] {
  return [...packageRoots]
    .sort((left, right) => left.localeCompare(right))
    .map((packageRoot) => ({
      id: getPackageNodeId(packageRoot),
      label: getPackageLabel(packageRoot),
      nodeType: 'package' as const,
    }));
}

function createPackageEdges(packageRoots: Set<string>, fileNodes: ViewGraphNode[]): ViewGraphEdge[] {
  const edges: ViewGraphEdge[] = [];

  for (const node of fileNodes) {
    const packageRoot = findNearestPackageRoot(node.id, packageRoots);
    if (!packageRoot) {
      continue;
    }

    const packageNodeId = getPackageNodeId(packageRoot);
    edges.push({
      id: `${packageNodeId}->${node.id}#${STRUCTURAL_NESTS_EDGE_KIND}`,
      from: packageNodeId,
      to: node.id,
      kind: STRUCTURAL_NESTS_EDGE_KIND,
      supportCount: 1,
      structural: true,
    });
  }

  return edges;
}

function collectConnectedPackageRoots(packageEdges: ViewGraphEdge[]): Set<string> {
  return new Set(
    packageEdges
      .map((edge) => edge.from)
      .filter((nodeId) => nodeId.startsWith(PACKAGE_NODE_ID_PREFIX))
      .map((nodeId) => nodeId.slice(PACKAGE_NODE_ID_PREFIX.length)),
  );
}

function countBy<T extends string>(values: Iterable<T>): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }

  return counts;
}

export function readViewGraph(
  context: QueryContext,
  options: ViewGraphOptions = {},
): ViewGraphResult {
  const limitations: string[] = [];
  const settings = readViewGraphSettings(context.repo, options);
  const focusFile = resolveFocusFile(options.focus, context);
  const focus = options.focus ?? focusFile;

  let fileNodes = [...context.files]
    .sort((left, right) => left.localeCompare(right))
    .map((filePath) => createFileNode(filePath));
  let fileEdges = buildFileEdges(context, options);

  if (!settings.showOrphans) {
    fileNodes = filterOrphans(fileNodes, fileEdges);
  }

  if (settings.depthMode) {
    if (!focusFile) {
      limitations.push('Depth mode requested without a focus file or symbol. Returned the broader graph.');
    } else if (!context.files.has(focusFile)) {
      limitations.push(`Focused file ${focusFile} is not present in the saved CodeGraphy index.`);
    } else {
      const depthGraph = applyDepthMode(fileNodes, fileEdges, focusFile, settings.depthLimit);
      fileNodes = depthGraph.nodes;
      fileEdges = depthGraph.edges;
    }
  }

  if (options.maxResults && fileNodes.length > options.maxResults) {
    const limitedGraph = limitFileNodes(fileNodes, fileEdges, focusFile, options.maxResults);
    fileNodes = limitedGraph.nodes;
    fileEdges = limitedGraph.edges;
    limitations.push(`Trimmed file nodes to ${options.maxResults}. Narrow the query or raise maxResults for a broader view.`);
  }

  const folderPaths = settings.includeFolders ? collectFolderPaths(fileNodes) : new Set<string>();
  const folderNodes = settings.includeFolders ? createFolderNodes(folderPaths) : [];
  const folderEdges = settings.includeFolders ? createFolderEdges(folderPaths, fileNodes) : [];
  const packageRoots = settings.includePackages ? collectPackageRoots(context.files) : new Set<string>();
  const packageEdges = settings.includePackages ? createPackageEdges(packageRoots, fileNodes) : [];
  const connectedPackageRoots = settings.includePackages
    ? collectConnectedPackageRoots(packageEdges)
    : new Set<string>();
  const packageNodes = settings.includePackages ? createPackageNodes(connectedPackageRoots) : [];

  const nodes = [...fileNodes, ...folderNodes, ...packageNodes];
  const edges = [...fileEdges, ...folderEdges, ...packageEdges];

  return {
    repo: context.repo,
    nodes,
    edges,
    summary: {
      focus,
      depthMode: settings.depthMode,
      depthLimit: settings.depthMode ? settings.depthLimit : undefined,
      includeFolders: settings.includeFolders,
      includePackages: settings.includePackages,
      showOrphans: settings.showOrphans,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodeTypeCounts: countBy(nodes.map((node) => node.nodeType)),
      edgeKindCounts: countBy(edges.map((edge) => edge.kind)),
    },
    limitations,
  };
}
