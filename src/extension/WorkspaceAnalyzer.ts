/**
 * @fileoverview Orchestrates workspace analysis by coordinating
 * file discovery, plugin execution, and caching.
 * @module extension/WorkspaceAnalyzer
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { PluginRegistry, IConnection } from '../core/plugins';
import { FileDiscovery, IDiscoveredFile } from '../core/discovery';
import { Configuration } from './Configuration';
import { createTypeScriptPlugin } from '../plugins/typescript';
import { createGDScriptPlugin } from '../plugins/godot';
import { ColorPaletteManager } from '../core/colors';
import { IGraphData, IGraphNode, IGraphEdge } from '../shared/types';

/**
 * Cache entry for a single file's analysis.
 */
interface ICachedFile {
  /** File modification time when cached */
  mtime: number;
  /** Detected connections */
  connections: IConnection[];
}

/**
 * Analysis cache stored in workspace state.
 */
interface IAnalysisCache {
  /** Cache format version */
  version: string;
  /** Cached file data */
  files: Record<string, ICachedFile>;
}

const CACHE_KEY = 'codegraphy.analysisCache';
const CACHE_VERSION = '1.0.0';

/**
 * Orchestrates workspace analysis.
 * 
 * The WorkspaceAnalyzer coordinates:
 * - File discovery using glob patterns
 * - Plugin-based connection detection
 * - Result caching for performance
 * - Graph data generation
 * 
 * @example
 * ```typescript
 * const analyzer = new WorkspaceAnalyzer(context);
 * await analyzer.initialize();
 * const graphData = await analyzer.analyze();
 * ```
 */
export class WorkspaceAnalyzer {
  private readonly _config: Configuration;
  private readonly _registry: PluginRegistry;
  private readonly _discovery: FileDiscovery;
  private readonly _context: vscode.ExtensionContext;
  private readonly _colorPalette: ColorPaletteManager;
  private _cache: IAnalysisCache;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._config = new Configuration();
    this._registry = new PluginRegistry();
    this._discovery = new FileDiscovery();
    this._colorPalette = new ColorPaletteManager();
    this._cache = this._loadCache();
  }

  /**
   * Initializes the analyzer and registers built-in plugins.
   */
  async initialize(): Promise<void> {
    // Register built-in TypeScript plugin
    const tsPlugin = createTypeScriptPlugin();
    this._registry.register(tsPlugin, { builtIn: true });

    // Register built-in GDScript plugin
    const gdPlugin = createGDScriptPlugin();
    this._registry.register(gdPlugin, { builtIn: true });

    // Collect plugin colors
    for (const pluginInfo of this._registry.list()) {
      if (pluginInfo.plugin.fileColors) {
        this._colorPalette.addPluginColors(pluginInfo.plugin.fileColors);
      }
    }

    // Initialize all plugins
    const workspaceRoot = this._getWorkspaceRoot();
    if (workspaceRoot) {
      await this._registry.initializeAll(workspaceRoot);
    }

    console.log('[CodeGraphy] WorkspaceAnalyzer initialized');
  }

  /**
   * Analyzes the workspace and returns graph data.
   * Uses caching for performance.
   */
  async analyze(): Promise<IGraphData> {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      console.log('[CodeGraphy] No workspace folder open');
      return { nodes: [], edges: [] };
    }

    // Discover ALL files (not filtered by extension)
    // Non-code files will appear as orphans if showOrphans is enabled
    const config = this._config.getAll();
    
    // Collect default exclude patterns from all plugins
    const pluginExcludes = this._collectPluginExcludes();
    
    // Merge: plugin defaults + user settings (user patterns take precedence)
    const mergedExclude = [...new Set([...pluginExcludes, ...config.exclude])];
    
    const discoveryResult = await this._discovery.discover({
      rootPath: workspaceRoot,
      maxFiles: config.maxFiles,
      include: config.include,
      exclude: mergedExclude,
      respectGitignore: config.respectGitignore,
      // Don't filter by extensions - we want all files as nodes
    });

    if (discoveryResult.limitReached) {
      vscode.window.showWarningMessage(
        `CodeGraphy: Found ${discoveryResult.totalFound}+ files, showing first ${config.maxFiles}. ` +
        `Increase codegraphy.maxFiles in settings to see more.`
      );
    }

    console.log(`[CodeGraphy] Discovered ${discoveryResult.files.length} files in ${discoveryResult.durationMs}ms`);

    // Generate color palette for all discovered extensions
    const extensions = discoveryResult.files.map(f => path.extname(f.relativePath).toLowerCase());
    this._colorPalette.generateForExtensions(extensions);
    
    // Apply user color overrides
    this._colorPalette.setUserColors(config.fileColors);

    // Analyze files (with caching)
    const fileConnections = await this._analyzeFiles(discoveryResult.files, workspaceRoot);

    // Build graph data
    const graphData = this._buildGraphData(fileConnections, workspaceRoot, config.showOrphans);

    // Save cache
    this._saveCache();

    console.log(`[CodeGraphy] Graph built: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`);

    return graphData;
  }

  /**
   * Clears the analysis cache.
   */
  clearCache(): void {
    this._cache = { version: CACHE_VERSION, files: {} };
    this._saveCache();
    console.log('[CodeGraphy] Cache cleared');
  }

  /**
   * Disposes of the analyzer and its resources.
   */
  dispose(): void {
    this._registry.disposeAll();
  }

  /**
   * Analyzes discovered files, using cache where possible.
   */
  private async _analyzeFiles(
    files: IDiscoveredFile[],
    workspaceRoot: string
  ): Promise<Map<string, IConnection[]>> {
    const results = new Map<string, IConnection[]>();
    let cacheHits = 0;
    let cacheMisses = 0;

    for (const file of files) {
      // Check cache
      const cached = this._cache.files[file.relativePath];
      const mtime = await this._getFileMtime(file.absolutePath);

      if (cached && cached.mtime === mtime) {
        // Cache hit
        results.set(file.relativePath, cached.connections);
        cacheHits++;
        continue;
      }

      // Cache miss - analyze file
      cacheMisses++;
      const content = await this._discovery.readContent(file);
      const connections = await this._registry.analyzeFile(
        file.absolutePath,
        content,
        workspaceRoot
      );

      results.set(file.relativePath, connections);

      // Update cache
      this._cache.files[file.relativePath] = {
        mtime: mtime ?? 0,
        connections,
      };
    }

    console.log(`[CodeGraphy] Analysis: ${cacheHits} cache hits, ${cacheMisses} misses`);
    return results;
  }

  /**
   * Builds graph data from file connections.
   */
  private _buildGraphData(
    fileConnections: Map<string, IConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean
  ): IGraphData {
    const nodes: IGraphNode[] = [];
    const edges: IGraphEdge[] = [];
    const nodeIds = new Set<string>();
    const connectedIds = new Set<string>();

    // First pass: create nodes and track connections
    for (const [filePath, connections] of fileConnections) {
      nodeIds.add(filePath);

      for (const conn of connections) {
        if (conn.resolvedPath) {
          const targetRelative = path.relative(workspaceRoot, conn.resolvedPath);
          
          // Only create edge if target is in our discovered files
          if (fileConnections.has(targetRelative)) {
            connectedIds.add(filePath);
            connectedIds.add(targetRelative);

            const edgeId = `${filePath}->${targetRelative}`;
            edges.push({
              id: edgeId,
              from: filePath,
              to: targetRelative,
            });
          }
        }
      }
    }

    // Second pass: create nodes
    for (const filePath of nodeIds) {
      // Skip orphans if configured
      if (!showOrphans && !connectedIds.has(filePath)) {
        continue;
      }

      const color = this._colorPalette.getColorForFile(filePath);

      nodes.push({
        id: filePath,
        label: path.basename(filePath),
        color,
      });
    }

    // Filter edges to only include nodes that exist
    const nodeIdSet = new Set(nodes.map((n) => n.id));
    const filteredEdges = edges.filter(
      (e) => nodeIdSet.has(e.from) && nodeIdSet.has(e.to)
    );

    return { nodes, edges: filteredEdges };
  }

  /**
   * Collects default exclude patterns from all registered plugins.
   * These are merged with user settings during file discovery.
   */
  private _collectPluginExcludes(): string[] {
    const excludes: string[] = [];
    
    for (const pluginInfo of this._registry.list()) {
      if (pluginInfo.plugin.defaultExclude) {
        excludes.push(...pluginInfo.plugin.defaultExclude);
      }
    }
    
    return excludes;
  }

  /**
   * Gets the workspace root folder path.
   */
  private _getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  /**
   * Gets the modification time of a file.
   */
  private async _getFileMtime(filePath: string): Promise<number | null> {
    try {
      const stat = await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return stat.mtime;
    } catch {
      return null;
    }
  }

  /**
   * Loads the analysis cache from workspace state.
   */
  private _loadCache(): IAnalysisCache {
    const cached = this._context.workspaceState.get<IAnalysisCache>(CACHE_KEY);
    
    if (cached && cached.version === CACHE_VERSION) {
      console.log(`[CodeGraphy] Loaded cache: ${Object.keys(cached.files).length} files`);
      return cached;
    }

    return { version: CACHE_VERSION, files: {} };
  }

  /**
   * Saves the analysis cache to workspace state.
   */
  private _saveCache(): void {
    this._context.workspaceState.update(CACHE_KEY, this._cache);
  }
}
