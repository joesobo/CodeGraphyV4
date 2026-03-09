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
import { createPythonPlugin } from '../plugins/python';
import { createCSharpPlugin } from '../plugins/csharp';
import { createMarkdownPlugin } from '../plugins/markdown';
import { ColorPaletteManager } from '../core/colors';
import { IGraphData, IGraphNode, IGraphEdge, DEFAULT_NODE_COLOR } from '../shared/types';
import { DEFAULT_EXCLUDE_PATTERNS } from './Configuration';

/**
 * Cache entry for a single file's analysis.
 */
interface ICachedFile {
  /** File modification time when cached */
  mtime: number;
  /** Detected connections */
  connections: IConnection[];
  /** File size in bytes */
  size?: number;
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
const CACHE_VERSION = '1.8.0'; // Bumped for Markdown plugin registration

/** Storage key for file visit counts in workspace state (shared with GraphViewProvider) */
const VISITS_KEY = 'codegraphy.fileVisits';

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

    // Register built-in Python plugin
    const pyPlugin = createPythonPlugin();
    this._registry.register(pyPlugin, { builtIn: true });

    // Register built-in C# plugin
    const csPlugin = createCSharpPlugin();
    this._registry.register(csPlugin, { builtIn: true });

    // Register built-in Markdown plugin
    const mdPlugin = createMarkdownPlugin();
    this._registry.register(mdPlugin, { builtIn: true });

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
   * Returns default filter patterns declared by all registered plugins.
   * These are shown in the Settings Panel as read-only "plugin defaults".
   */
  getPluginFilterPatterns(): string[] {
    const patterns: string[] = [];
    for (const pluginInfo of this._registry.list()) {
      if (pluginInfo.plugin.defaultFilterPatterns) {
        patterns.push(...pluginInfo.plugin.defaultFilterPatterns);
      }
    }
    return [...new Set(patterns)];
  }

  /**
   * Analyzes the workspace and returns graph data.
   * Uses caching for performance.
   */
  async analyze(filterPatterns: string[] = []): Promise<IGraphData> {
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

    // Collect plugin-declared filter patterns (user-visible defaults)
    const pluginFilterPatterns = this.getPluginFilterPatterns();

    // Merge: hardcoded defaults + plugin excludes + plugin filter patterns + user filter patterns
    const mergedExclude = [...new Set([...DEFAULT_EXCLUDE_PATTERNS, ...pluginExcludes, ...pluginFilterPatterns, ...filterPatterns])];

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

    // Pre-analysis pass: let plugins build workspace-wide indexes before per-file analysis.
    // Needed for cross-file references that require seeing all files first (e.g. GDScript class_name).
    await this._preAnalyzePlugins(discoveryResult.files, workspaceRoot);

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
   * Pre-analysis pass: calls preAnalyze on any plugin that implements it.
   * Reads all files for each plugin's supported extensions so the plugin can
   * build workspace-wide indexes (e.g. the GDScript class_name → file map).
   */
  private async _preAnalyzePlugins(files: IDiscoveredFile[], workspaceRoot: string): Promise<void> {
    for (const pluginInfo of this._registry.list()) {
      const plugin = pluginInfo.plugin;
      if (!plugin.preAnalyze) continue;

      const supportedFiles: Array<{ absolutePath: string; relativePath: string; content: string }> = [];
      for (const file of files) {
        const ext = path.extname(file.relativePath).toLowerCase();
        if (plugin.supportedExtensions.includes(ext)) {
          const content = await this._discovery.readContent(file);
          supportedFiles.push({ absolutePath: file.absolutePath, relativePath: file.relativePath, content });
        }
      }

      if (supportedFiles.length > 0) {
        await plugin.preAnalyze(supportedFiles, workspaceRoot);
      }
    }
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
      const stat = await this._getFileStat(file.absolutePath);

      if (cached && cached.mtime === stat?.mtime) {
        // Cache hit - but update size if missing (migration from old cache)
        if (cached.size === undefined && stat?.size !== undefined) {
          cached.size = stat.size;
        }
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

      // Update cache with connections and size
      this._cache.files[file.relativePath] = {
        mtime: stat?.mtime ?? 0,
        connections,
        size: stat?.size,
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
    const edgeIds = new Set<string>();

    // Get visit counts from workspace state (for access-count mode)
    const visitCounts = this._context.workspaceState.get<Record<string, number>>(VISITS_KEY) ?? {};

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

            // Deduplicate: a file may import the same target via multiple
            // mechanisms (e.g. extends path + class_name usage)
            const edgeId = `${filePath}->${targetRelative}`;
            if (!edgeIds.has(edgeId)) {
              edgeIds.add(edgeId);
              edges.push({
                id: edgeId,
                from: filePath,
                to: targetRelative,
              });
            }
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

      const color = DEFAULT_NODE_COLOR;
      const cached = this._cache.files[filePath];

      nodes.push({
        id: filePath,
        label: path.basename(filePath),
        color,
        fileSize: cached?.size,
        accessCount: visitCounts[filePath] ?? 0,
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
   * Gets file stat (mtime and size).
   */
  private async _getFileStat(filePath: string): Promise<{ mtime: number; size: number } | null> {
    try {
      const stat = await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return { mtime: stat.mtime, size: stat.size };
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
