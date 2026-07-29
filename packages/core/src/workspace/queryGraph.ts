import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import { readWorkspaceAnalysisDatabaseSnapshot } from '../graphCache/database/storage';
import { filterInactivePluginSnapshotFacts } from '../plugins/activityState/analysisFacts';
import { createPluginActivityState } from '../plugins/activityState/model';
import type { CodeGraphyInstalledPluginCache } from '../plugins/installedCache';
import { CODEGRAPHY_MARKDOWN_PLUGIN_ID, readCodeGraphyWorkspaceSettings } from './settings';
import { normalizeWorkspaceQueryFacts } from './queryFacts';
import { matchesAnyPattern } from '../discovery/pathMatching';
import type { IGraphData } from '../graph/contracts';
import { getNodeType } from '../visibleGraph/model';
import type { GraphQuerySourceText } from '../graphQuery/data';
import { resolveProjectedGraphNodeTypes } from './graphScopeProjection/model';
import { resolveSavedGraphScope } from './graphScopeSettings';
import type { WorkspaceGraphQueryProjection } from './requestTypes';

const MAX_QUERY_SOURCE_FILE_BYTES = 1024 * 1024;

function isInsideWorkspace(workspaceRoot: string, absolutePath: string): boolean {
  const relativePath = path.relative(workspaceRoot, absolutePath);
  return relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath);
}

interface QuerySourceFileResult {
  file?: GraphQuerySourceText['files'][number];
  changed: boolean;
}

function readQuerySourceFileData(absolutePath: string): {
  content?: string;
  contentHash: string;
} {
  const hash = createHash('sha256');
  const decoder = new StringDecoder('utf8');
  const buffer = Buffer.allocUnsafe(64 * 1024);
  const contentParts: string[] = [];
  const descriptor = fs.openSync(absolutePath, 'r');
  let totalBytes = 0;
  try {
    let bytesRead = 0;
    while ((bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null)) > 0) {
      totalBytes += bytesRead;
      const decoded = decoder.write(buffer.subarray(0, bytesRead));
      hash.update(decoded);
      if (totalBytes <= MAX_QUERY_SOURCE_FILE_BYTES) contentParts.push(decoded);
      else contentParts.length = 0;
    }
    const remaining = decoder.end();
    hash.update(remaining);
    if (totalBytes <= MAX_QUERY_SOURCE_FILE_BYTES) contentParts.push(remaining);
    return {
      content: totalBytes <= MAX_QUERY_SOURCE_FILE_BYTES
        ? contentParts.join('')
        : undefined,
      contentHash: hash.digest('hex'),
    };
  } finally {
    fs.closeSync(descriptor);
  }
}

function readQuerySourceFile(
  workspaceRoot: string,
  filePath: string,
  indexedContentHash: string | undefined,
): QuerySourceFileResult {
  const absolutePath = path.resolve(workspaceRoot, filePath);
  const unavailableResult = { changed: indexedContentHash !== undefined };
  if (!isInsideWorkspace(workspaceRoot, absolutePath)) return unavailableResult;

  try {
    const { content, contentHash } = readQuerySourceFileData(absolutePath);
    const changed = indexedContentHash !== undefined && indexedContentHash !== contentHash;
    if (content === undefined || content.includes('\0')) return { changed };
    return {
      file: { filePath, content },
      changed,
    };
  } catch {
    return unavailableResult;
  }
}

export function readWorkspaceQuerySourceText(
  workspaceRoot: string,
  graphData: IGraphData,
  indexedContentHashes: ReadonlyMap<string, string> = new Map(),
): GraphQuerySourceText {
  const results = graphData.nodes
    .filter(node => getNodeType(node) === 'file')
    .map(node => readQuerySourceFile(workspaceRoot, node.id, indexedContentHashes.get(node.id)));
  const files = results.flatMap(result => result.file ? [result.file] : []);

  return {
    files,
    filesScanned: files.length,
    filesSkipped: results.length - files.length,
    hasChangedFiles: results.some(result => result.changed),
  };
}

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

function filterSnapshotFactsToGraph(
  snapshotFacts: ReturnType<typeof normalizeWorkspaceQueryFacts>,
  graphData: IGraphData,
) {
  const allowedFilePaths = new Set(
    graphData.nodes.filter(node => getNodeType(node) === 'file').map(node => node.id),
  );
  const symbols = snapshotFacts.symbols.filter(symbol => allowedFilePaths.has(symbol.filePath));
  const symbolFilePaths = new Map(snapshotFacts.symbols.map(symbol => [symbol.id, symbol.filePath]));
  const relations = snapshotFacts.relations.filter((relation) => {
    if (!allowedFilePaths.has(relation.fromFilePath)) return false;
    const targetFilePath = relation.toFilePath
      ?? relation.resolvedPath
      ?? (relation.toSymbolId ? symbolFilePaths.get(relation.toSymbolId) : undefined);
    return !targetFilePath || allowedFilePaths.has(targetFilePath);
  });

  return { symbols, relations };
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
    indexedContentHashes: new Map(snapshot.files.flatMap(file => (
      file.contentHash ? [[file.filePath, file.contentHash] as const] : []
    ))),
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
    snapshotFacts: filterSnapshotFactsToGraph(source.snapshotFacts, graphData),
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
