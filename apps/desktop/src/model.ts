export interface DesktopGraphNode {
  id: string;
  label: string;
  nodeType?: 'file' | 'folder';
}

export interface DesktopGraphEdge {
  id: string;
  from: string;
  to: string;
  kind: string;
}

export interface DesktopGraph {
  nodes: DesktopGraphNode[];
  edges: DesktopGraphEdge[];
}

interface ReadyWorkspaceGraphResult {
  kind: 'ready';
  workspaceRoot: string;
  graphCache: string;
  cacheStatus: {
    state: 'fresh' | 'stale';
    staleReasons: string[];
  };
  graph: DesktopGraph;
  indexing?: {
    mode: 'full' | 'incremental';
    analyzedFiles: number;
    deletedFiles: number;
    reusedFiles: number;
  };
  discovery?: {
    indexedFiles: number;
    totalFound: number;
    limitReached: boolean;
  };
}

export type WorkspaceGraphResult =
  | {
      kind: 'unreadable';
      workspaceRoot: string;
      graphCache: string;
      message: string;
    }
  | ReadyWorkspaceGraphResult;

export type FileTreeEntry =
  | { kind: 'file'; name: string; path: string }
  | { kind: 'folder'; name: string; path: string; children: FileTreeEntry[] };

interface MutableFolder {
  folders: Map<string, MutableFolder>;
  files: Map<string, string>;
  path: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isDesktopGraphNode(value: unknown): value is DesktopGraphNode {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.label !== 'string') return false;
  return value.symbol === undefined
    && (value.nodeType === undefined || value.nodeType === 'file' || value.nodeType === 'folder');
}

function isDesktopGraphEdge(value: unknown): value is DesktopGraphEdge {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.from === 'string'
    && typeof value.to === 'string'
    && typeof value.kind === 'string';
}

function isDesktopGraph(value: unknown): value is DesktopGraph {
  return isRecord(value)
    && Array.isArray(value.nodes)
    && value.nodes.every(isDesktopGraphNode)
    && Array.isArray(value.edges)
    && value.edges.every(isDesktopGraphEdge);
}

function isCacheStatus(value: unknown): value is ReadyWorkspaceGraphResult['cacheStatus'] {
  return isRecord(value)
    && (value.state === 'fresh' || value.state === 'stale')
    && isStringArray(value.staleReasons);
}

function isIndexing(value: unknown): value is NonNullable<ReadyWorkspaceGraphResult['indexing']> {
  return isRecord(value)
    && (value.mode === 'full' || value.mode === 'incremental')
    && typeof value.analyzedFiles === 'number'
    && typeof value.deletedFiles === 'number'
    && typeof value.reusedFiles === 'number';
}

function isDiscovery(value: unknown): value is NonNullable<ReadyWorkspaceGraphResult['discovery']> {
  return isRecord(value)
    && typeof value.indexedFiles === 'number'
    && typeof value.totalFound === 'number'
    && typeof value.limitReached === 'boolean';
}

export function parseWorkspaceGraphResult(value: unknown): WorkspaceGraphResult {
  if (!isRecord(value)
    || typeof value.workspaceRoot !== 'string'
    || typeof value.graphCache !== 'string') {
    throw new Error('Core returned an invalid Relationship Graph response.');
  }
  if (value.kind === 'unreadable' && typeof value.message === 'string') {
    return {
      kind: 'unreadable',
      workspaceRoot: value.workspaceRoot,
      graphCache: value.graphCache,
      message: value.message,
    };
  }
  if (value.kind !== 'ready'
    || !isDesktopGraph(value.graph)
    || !isCacheStatus(value.cacheStatus)
    || (value.indexing !== undefined && !isIndexing(value.indexing))
    || (value.discovery !== undefined && !isDiscovery(value.discovery))) {
    throw new Error('Core returned an invalid Relationship Graph response.');
  }
  return {
    kind: 'ready',
    workspaceRoot: value.workspaceRoot,
    graphCache: value.graphCache,
    cacheStatus: value.cacheStatus,
    graph: value.graph,
    ...(value.indexing ? { indexing: value.indexing } : {}),
    ...(value.discovery ? { discovery: value.discovery } : {}),
  };
}

function createMutableFolder(path: string): MutableFolder {
  return { folders: new Map(), files: new Map(), path };
}

function compareTreeEntries(left: FileTreeEntry, right: FileTreeEntry): number {
  return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });
}

function projectFolder(folder: MutableFolder): FileTreeEntry[] {
  const files: FileTreeEntry[] = [...folder.files]
    .map(([name, path]) => ({ kind: 'file', name, path }));
  const folders: FileTreeEntry[] = [...folder.folders]
    .map(([name, child]) => ({
      kind: 'folder',
      name,
      path: child.path,
      children: projectFolder(child),
    }));
  return [...files, ...folders].sort(compareTreeEntries);
}

export function buildFileTree(graph: DesktopGraph): FileTreeEntry[] {
  const root = createMutableFolder('');
  for (const node of graph.nodes) {
    if (node.nodeType === 'folder') continue;
    const parts = node.id.split('/').filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) continue;
    let folder = root;
    for (const folderName of parts) {
      const folderPath = folder.path ? `${folder.path}/${folderName}` : folderName;
      let child = folder.folders.get(folderName);
      if (!child) {
        child = createMutableFolder(folderPath);
        folder.folders.set(folderName, child);
      }
      folder = child;
    }
    folder.files.set(fileName, node.id);
  }
  return projectFolder(root);
}

export function countFiles(graph: DesktopGraph): number {
  return graph.nodes.filter(node => node.nodeType !== 'folder').length;
}
