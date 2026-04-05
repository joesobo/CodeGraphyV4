/**
 * @fileoverview TypeScript/JavaScript plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual source modules in sources/.
 * @module plugins/typescript
 */

import type {
  CodeGraphyAPI,
  Disposable,
  IConnection,
  IGraphData,
  IGraphNode,
  IPlugin,
  IView,
  IViewContext,
} from '@codegraphy-vscode/plugin-api';
import { PathResolver } from './PathResolver';
import { loadTsConfig } from './tsconfig';
import manifest from '../codegraphy.json';

// Source detect functions
import { detect as detectEs6Import } from './sources/es6-import';
import { detect as detectReexport } from './sources/reexport';
import { detect as detectDynamicImport } from './sources/dynamic-import';
import { detect as detectCommonjsRequire } from './sources/commonjs-require';

export { PathResolver } from './PathResolver';
export type { IPathResolverConfig } from './PathResolver';

const TS_FOCUSED_IMPORT_VIEW_ID = 'codegraphy.typescript.focused-imports';
const TS_FOCUSED_IMPORT_VIEW_NAME = 'Focused Imports';
const TS_VIEW_EDGE_KINDS = new Set(['import', 'reexport']);

function filterTypeScriptImportEdges(data: IGraphData): IGraphData {
  const edges = data.edges.filter(edge =>
    TS_VIEW_EDGE_KINDS.has(edge.kind)
    && edge.sources.some(source => source.pluginId === manifest.id),
  );
  const nodeIds = new Set<string>();
  for (const edge of edges) {
    nodeIds.add(edge.from);
    nodeIds.add(edge.to);
  }

  return {
    nodes: data.nodes.filter(node => nodeIds.has(node.id)),
    edges,
  };
}

function buildUndirectedAdjacencyList(data: IGraphData): Map<string, Set<string>> {
  const adjacencyList = new Map<string, Set<string>>();

  for (const node of data.nodes) {
    adjacencyList.set(node.id, new Set());
  }

  for (const edge of data.edges) {
    adjacencyList.get(edge.from)?.add(edge.to);
    adjacencyList.get(edge.to)?.add(edge.from);
  }

  return adjacencyList;
}

function walkDepthFromNode(
  rootNodeId: string,
  depthLimit: number,
  adjacencyList: Map<string, Set<string>>,
): Map<string, number> {
  const depths = new Map<string, number>();

  if (!adjacencyList.has(rootNodeId)) {
    return depths;
  }

  const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: rootNodeId, depth: 0 }];
  depths.set(rootNodeId, 0);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (!current) continue;

    if (current.depth >= depthLimit) {
      continue;
    }

    for (const neighbor of adjacencyList.get(current.nodeId) ?? []) {
      if (depths.has(neighbor)) continue;
      const nextDepth = current.depth + 1;
      depths.set(neighbor, nextDepth);
      queue.push({ nodeId: neighbor, depth: nextDepth });
    }
  }

  return depths;
}

function filterFocusedImportGraph(data: IGraphData, context: IViewContext): IGraphData {
  const importGraph = filterTypeScriptImportEdges(data);
  const focusedFile = context.focusedFile;
  if (!focusedFile) {
    return importGraph;
  }

  const adjacencyList = buildUndirectedAdjacencyList(importGraph);
  const depthLimit = Math.max(1, context.depthLimit ?? 1);
  const depths = walkDepthFromNode(focusedFile, depthLimit, adjacencyList);
  if (depths.size === 0) {
    return importGraph;
  }

  const includedNodeIds = new Set(depths.keys());
  const nodes: IGraphNode[] = importGraph.nodes
    .filter(node => includedNodeIds.has(node.id))
    .map(node => ({
      ...node,
      depthLevel: depths.get(node.id),
    }));
  const edges = importGraph.edges.filter(
    edge => includedNodeIds.has(edge.from) && includedNodeIds.has(edge.to),
  );

  return { nodes, edges };
}

function createFocusedImportView(): IView {
  return {
    id: TS_FOCUSED_IMPORT_VIEW_ID,
    name: TS_FOCUSED_IMPORT_VIEW_NAME,
    icon: 'symbol-file',
    description: 'Shows the import neighborhood around the focused file',
    recomputeOn: ['focusedFile', 'depthLimit'],
    transform(data: IGraphData, context: IViewContext): IGraphData {
      return filterFocusedImportGraph(data, context);
    },
  };
}

/**
 * Built-in plugin for TypeScript and JavaScript files.
 *
 * Uses the TypeScript Compiler API to accurately detect imports,
 * then resolves them to file paths using tsconfig settings.
 *
 * @example
 * ```typescript
 * import { createTypeScriptPlugin } from './plugins/typescript';
 *
 * const plugin = createTypeScriptPlugin();
 * registry.register(plugin, { builtIn: true });
 * ```
 */
export function createTypeScriptPlugin(): IPlugin {
  let resolver: PathResolver | null = null;
  let focusedImportViewDisposable: Disposable | null = null;

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    sources: manifest.sources,
    fileColors: manifest.fileColors,
    onLoad(api: CodeGraphyAPI): void {
      focusedImportViewDisposable?.dispose();
      focusedImportViewDisposable = api.registerView(createFocusedImportView());
    },
    async initialize(workspaceRoot: string): Promise<void> {
      const config = loadTsConfig(workspaceRoot);
      resolver = new PathResolver(workspaceRoot, config);

      console.log('[CodeGraphy] TypeScript plugin initialized');
    },

    async detectConnections(
      filePath: string,
      content: string,
      workspaceRoot: string
    ): Promise<IConnection[]> {
      if (!resolver) {
        const config = loadTsConfig(workspaceRoot);
        resolver = new PathResolver(workspaceRoot, config);
      }

      const ctx = { resolver };

      return [
        ...detectEs6Import(content, filePath, ctx),
        ...detectReexport(content, filePath, ctx),
        ...detectDynamicImport(content, filePath, ctx),
        ...detectCommonjsRequire(content, filePath, ctx),
      ];
    },

    onUnload(): void {
      focusedImportViewDisposable?.dispose();
      focusedImportViewDisposable = null;
      resolver = null;
    },
  };
}

// Default export for convenience
export default createTypeScriptPlugin;
