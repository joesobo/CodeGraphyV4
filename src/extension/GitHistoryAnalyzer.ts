/**
 * @fileoverview Analyzes git history for the timeline feature.
 * Builds per-commit graph data using diff-based incremental analysis
 * and caches results to disk for fast subsequent loads.
 * @module extension/GitHistoryAnalyzer
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { minimatch } from 'minimatch';
import { PluginRegistry } from '../core/plugins/PluginRegistry';
import { IGraphData, IGraphNode, IGraphEdge, ICommitInfo, getFileColor } from '../shared/types';

const COMMITS_STATE_KEY = 'codegraphy.timelineCommits';
const CACHE_VERSION_KEY = 'codegraphy.timelineCacheVersion';
const CACHE_VERSION = '1.1.0';

/**
 * Service that analyzes git history and builds per-commit graph data
 * for the timeline feature.
 *
 * Uses incremental diff-based analysis: the oldest commit is fully
 * analyzed, then each subsequent commit clones the previous graph
 * and applies only the diff.
 */
export class GitHistoryAnalyzer {
  private readonly _context: vscode.ExtensionContext;
  private readonly _registry: PluginRegistry;
  private readonly _workspaceRoot: string;
  private readonly _excludePatterns: string[];

  constructor(
    context: vscode.ExtensionContext,
    registry: PluginRegistry,
    workspaceRoot: string,
    excludePatterns: string[] = []
  ) {
    this._context = context;
    this._registry = registry;
    this._workspaceRoot = workspaceRoot;
    this._excludePatterns = excludePatterns;
  }

  /**
   * Tests whether a file path should be excluded based on configured patterns.
   */
  private _shouldExclude(filePath: string): boolean {
    return this._excludePatterns.some((pattern) =>
      minimatch(filePath, pattern, { matchBase: true })
    );
  }

  /**
   * Runs a git command safely using execFile (no shell interpolation).
   */
  private execGit(args: string[], signal?: AbortSignal): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (signal?.aborted) {
        reject(this._createAbortError());
        return;
      }

      const child = execFile(
        'git',
        args,
        { cwd: this._workspaceRoot, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        }
      );

      if (signal) {
        const onAbort = () => {
          child.kill();
          reject(this._createAbortError());
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }

  /**
   * Retrieves the list of commits on the default branch, ordered oldest-first.
   *
   * @param maxCommits - Maximum number of commits to retrieve
   * @param signal - AbortSignal to cancel the operation
   * @returns Array of ICommitInfo ordered oldest-first
   */
  async getCommitList(maxCommits: number, signal: AbortSignal): Promise<ICommitInfo[]> {
    // Detect the default branch
    const defaultBranch = (
      await this.execGit(['rev-parse', '--abbrev-ref', 'HEAD'], signal)
    ).trim();

    const output = await this.execGit(
      [
        'log',
        '--first-parent',
        defaultBranch,
        '--format=%H|%at|%s|%an|%P',
        '-n',
        String(maxCommits),
      ],
      signal
    );

    const lines = output.trim().split('\n').filter(Boolean);
    const commits: ICommitInfo[] = [];

    for (const line of lines) {
      const parts = line.split('|', 5);
      if (parts.length < 4) {
        continue;
      }

      const [sha, timestampStr, message, author, parentsStr] = parts;
      commits.push({
        sha,
        timestamp: parseInt(timestampStr, 10),
        message: message ?? '',
        author: author ?? '',
        parents: parentsStr ? parentsStr.split(' ').filter(Boolean) : [],
      });
    }

    // Git log returns newest-first; reverse to oldest-first
    commits.reverse();
    return commits;
  }

  /**
   * Returns cached graph data for a commit, or empty graph on cache miss.
   *
   * @param sha - The commit SHA to look up
   * @returns Cached IGraphData or empty graph data
   */
  async getGraphDataForCommit(sha: string): Promise<IGraphData> {
    const cachePath = this._getCachePath(sha);
    if (!cachePath) {
      return { nodes: [], edges: [] };
    }

    try {
      await fs.promises.access(cachePath);
      const raw = await fs.promises.readFile(cachePath, 'utf-8');
      return JSON.parse(raw) as IGraphData;
    } catch {
      return { nodes: [], edges: [] };
    }
  }

  /**
   * Indexes the full git history using incremental diff-based analysis.
   *
   * The first (oldest) commit is fully analyzed from its tree.
   * Each subsequent commit clones the previous graph and applies
   * only the files changed in the diff.
   *
   * @param onProgress - Callback for progress reporting
   * @param signal - AbortSignal to cancel the operation
   * @returns The list of commits that were indexed
   */
  async indexHistory(
    onProgress: (phase: string, current: number, total: number) => void,
    signal: AbortSignal,
    maxCommits: number = 500
  ): Promise<ICommitInfo[]> {
    const commits = await this.getCommitList(maxCommits, signal);
    if (commits.length === 0) {
      return [];
    }

    const total = commits.length;
    let previousGraphData: IGraphData = { nodes: [], edges: [] };

    for (let i = 0; i < commits.length; i++) {
      if (signal.aborted) {
        throw this._createAbortError();
      }

      const commit = commits[i];
      onProgress('Indexing commits', i + 1, total);

      if (i === 0) {
        // Full analysis for the first (oldest) commit
        previousGraphData = await this._analyzeFullCommit(commit.sha, signal);
      } else {
        // Diff-based analysis for subsequent commits
        const parentSha = commits[i - 1].sha;
        previousGraphData = await this._analyzeDiffCommit(
          commit.sha,
          parentSha,
          previousGraphData,
          signal
        );
      }

      await this._cacheGraphData(commit.sha, previousGraphData);
    }

    // Persist commit list in workspaceState
    this._context.workspaceState.update(COMMITS_STATE_KEY, commits);
    this._context.workspaceState.update(CACHE_VERSION_KEY, CACHE_VERSION);

    return commits;
  }

  /**
   * Deletes the entire git-cache directory under storageUri.
   */
  async invalidateCache(): Promise<void> {
    const cacheDir = this._getCacheDir();
    if (cacheDir) {
      try {
        await fs.promises.rm(cacheDir, { recursive: true, force: true });
      } catch {
        // Directory may not exist; that's fine
      }
    }

    this._context.workspaceState.update(COMMITS_STATE_KEY, undefined);
    this._context.workspaceState.update(CACHE_VERSION_KEY, undefined);
  }

  /**
   * Checks whether a cached timeline exists in workspaceState.
   */
  hasCachedTimeline(): boolean {
    const version = this._context.workspaceState.get<string>(CACHE_VERSION_KEY);
    return version === CACHE_VERSION;
  }

  /**
   * Returns the cached commit list from workspaceState, or null if none.
   */
  getCachedCommitList(): ICommitInfo[] | null {
    if (!this.hasCachedTimeline()) {
      return null;
    }
    return this._context.workspaceState.get<ICommitInfo[]>(COMMITS_STATE_KEY) ?? null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Fully analyzes a commit by listing all files in its tree.
   */
  private async _analyzeFullCommit(sha: string, signal: AbortSignal): Promise<IGraphData> {
    if (signal.aborted) {
      throw this._createAbortError();
    }

    const output = await this.execGit(['ls-tree', '-r', '--name-only', sha], signal);
    const allFiles = output.trim().split('\n').filter(Boolean);

    // Filter to files supported by plugins AND not excluded by patterns
    const supportedExts = new Set(this._registry.getSupportedExtensions());
    const files = allFiles.filter((f) => {
      if (this._shouldExclude(f)) return false;
      const ext = path.extname(f).toLowerCase();
      return supportedExts.has(ext);
    });

    const nodes: IGraphNode[] = [];
    const edges: IGraphEdge[] = [];
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();

    for (const filePath of files) {
      if (signal.aborted) {
        throw this._createAbortError();
      }

      const content = await this._getFileAtCommit(sha, filePath, signal);
      const absPath = path.join(this._workspaceRoot, filePath);
      const connections = await this._registry.analyzeFile(absPath, content, this._workspaceRoot);

      // Add node
      if (!nodeIds.has(filePath)) {
        nodeIds.add(filePath);
        nodes.push(this._createNode(filePath));
      }

      // Add edges from connections
      for (const conn of connections) {
        if (conn.resolvedPath) {
          const targetRelative = path.relative(this._workspaceRoot, conn.resolvedPath);
          const edgeId = `${filePath}->${targetRelative}`;
          if (!edgeIds.has(edgeId)) {
            edgeIds.add(edgeId);
            const edge: IGraphEdge = { id: edgeId, from: filePath, to: targetRelative };
            if (conn.ruleId) edge.ruleId = conn.ruleId;
            edges.push(edge);
          }
        }
      }
    }

    // Filter edges to only reference existing nodes
    const filteredEdges = edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));

    return { nodes, edges: filteredEdges };
  }

  /**
   * Analyzes a commit by applying its diff to the previous commit's graph data.
   */
  private async _analyzeDiffCommit(
    sha: string,
    parentSha: string,
    previousGraph: IGraphData,
    signal: AbortSignal
  ): Promise<IGraphData> {
    if (signal.aborted) {
      throw this._createAbortError();
    }

    const output = await this.execGit(
      ['diff', '--name-status', '-M', parentSha, sha],
      signal
    );

    const lines = output.trim().split('\n').filter(Boolean);

    // Clone previous graph data
    const nodes = previousGraph.nodes.map((n) => ({ ...n }));
    const edges = previousGraph.edges.map((e) => ({ ...e }));

    const nodeMap = new Map<string, IGraphNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    const edgeSet = new Set(edges.map((e) => e.id));

    for (const line of lines) {
      if (signal.aborted) {
        throw this._createAbortError();
      }

      const parts = line.split('\t');
      const status = parts[0];

      if (status.startsWith('R')) {
        // Rename: R100\toldPath\tnewPath
        const oldPath = parts[1];
        const newPath = parts[2];
        this._handleRename(oldPath, newPath, nodes, edges, nodeMap, edgeSet);
        // Re-analyze the renamed file for updated connections
        await this._reanalyzeFile(sha, newPath, nodes, edges, nodeMap, edgeSet, signal);
      } else if (status === 'A') {
        // Added
        const filePath = parts[1];
        await this._handleAdd(sha, filePath, nodes, edges, nodeMap, edgeSet, signal);
      } else if (status === 'M') {
        // Modified
        const filePath = parts[1];
        await this._handleModify(sha, filePath, nodes, edges, nodeMap, edgeSet, signal);
      } else if (status === 'D') {
        // Deleted
        const filePath = parts[1];
        this._handleDelete(filePath, nodes, edges, nodeMap, edgeSet);
      }
    }

    // Filter edges to only reference existing nodes
    const nodeIds = new Set(nodes.map((n) => n.id));
    const filteredEdges = edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));

    return { nodes, edges: filteredEdges };
  }

  /**
   * Handles an added file: creates a node and analyzes connections.
   */
  private async _handleAdd(
    sha: string,
    filePath: string,
    nodes: IGraphNode[],
    edges: IGraphEdge[],
    nodeMap: Map<string, IGraphNode>,
    edgeSet: Set<string>,
    signal: AbortSignal
  ): Promise<void> {
    // Skip files matching exclude patterns
    if (this._shouldExclude(filePath)) return;

    if (!this._registry.supportsFile(filePath)) {
      // Still add as a node even if no plugin supports it
      if (!nodeMap.has(filePath)) {
        const node = this._createNode(filePath);
        nodes.push(node);
        nodeMap.set(filePath, node);
      }
      return;
    }

    if (!nodeMap.has(filePath)) {
      const node = this._createNode(filePath);
      nodes.push(node);
      nodeMap.set(filePath, node);
    }

    await this._reanalyzeFile(sha, filePath, nodes, edges, nodeMap, edgeSet, signal);
  }

  /**
   * Handles a modified file: re-analyzes connections.
   */
  private async _handleModify(
    sha: string,
    filePath: string,
    nodes: IGraphNode[],
    edges: IGraphEdge[],
    nodeMap: Map<string, IGraphNode>,
    edgeSet: Set<string>,
    signal: AbortSignal
  ): Promise<void> {
    if (!this._registry.supportsFile(filePath)) {
      return;
    }

    // Remove existing edges from this file
    this._removeEdgesFrom(filePath, edges, edgeSet);

    await this._reanalyzeFile(sha, filePath, nodes, edges, nodeMap, edgeSet, signal);
  }

  /**
   * Handles a deleted file: removes node and all associated edges.
   */
  private _handleDelete(
    filePath: string,
    nodes: IGraphNode[],
    edges: IGraphEdge[],
    nodeMap: Map<string, IGraphNode>,
    edgeSet: Set<string>
  ): void {
    // Remove the node
    const idx = nodes.findIndex((n) => n.id === filePath);
    if (idx !== -1) {
      nodes.splice(idx, 1);
    }
    nodeMap.delete(filePath);

    // Remove all edges referencing this file (both from and to)
    const toRemove: number[] = [];
    for (let i = edges.length - 1; i >= 0; i--) {
      if (edges[i].from === filePath || edges[i].to === filePath) {
        edgeSet.delete(edges[i].id);
        toRemove.push(i);
      }
    }
    for (const i of toRemove) {
      edges.splice(i, 1);
    }
  }

  /**
   * Handles a rename: updates node id/label and repoints all edges.
   */
  private _handleRename(
    oldPath: string,
    newPath: string,
    _nodes: IGraphNode[],
    edges: IGraphEdge[],
    nodeMap: Map<string, IGraphNode>,
    edgeSet: Set<string>
  ): void {
    const node = nodeMap.get(oldPath);
    if (node) {
      // Update node identity
      node.id = newPath;
      node.label = path.basename(newPath);
      node.color = getFileColor(path.extname(newPath));

      // Update the map
      nodeMap.delete(oldPath);
      nodeMap.set(newPath, node);
    }

    // Repoint edges
    for (const edge of edges) {
      let changed = false;
      const oldId = edge.id;

      if (edge.from === oldPath) {
        edge.from = newPath;
        changed = true;
      }
      if (edge.to === oldPath) {
        edge.to = newPath;
        changed = true;
      }
      if (changed) {
        edgeSet.delete(oldId);
        edge.id = `${edge.from}->${edge.to}`;
        edgeSet.add(edge.id);
      }
    }
  }

  /**
   * Re-analyzes a single file at a given commit and adds its edges.
   */
  private async _reanalyzeFile(
    sha: string,
    filePath: string,
    nodes: IGraphNode[],
    edges: IGraphEdge[],
    nodeMap: Map<string, IGraphNode>,
    edgeSet: Set<string>,
    signal: AbortSignal
  ): Promise<void> {
    if (!this._registry.supportsFile(filePath)) {
      return;
    }

    const content = await this._getFileAtCommit(sha, filePath, signal);
    const absPath = path.join(this._workspaceRoot, filePath);
    const connections = await this._registry.analyzeFile(absPath, content, this._workspaceRoot);

    // Ensure source node exists
    if (!nodeMap.has(filePath)) {
      const node = this._createNode(filePath);
      nodes.push(node);
      nodeMap.set(filePath, node);
    }

    for (const conn of connections) {
      if (conn.resolvedPath) {
        const targetRelative = path.relative(this._workspaceRoot, conn.resolvedPath);
        const edgeId = `${filePath}->${targetRelative}`;
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          const edge: IGraphEdge = { id: edgeId, from: filePath, to: targetRelative };
          if (conn.ruleId) edge.ruleId = conn.ruleId;
          edges.push(edge);
        }
      }
    }
  }

  /**
   * Removes all outgoing edges from a given file.
   */
  private _removeEdgesFrom(
    filePath: string,
    edges: IGraphEdge[],
    edgeSet: Set<string>
  ): void {
    for (let i = edges.length - 1; i >= 0; i--) {
      if (edges[i].from === filePath) {
        edgeSet.delete(edges[i].id);
        edges.splice(i, 1);
      }
    }
  }

  /**
   * Retrieves file content at a specific commit via `git show`.
   */
  private async _getFileAtCommit(
    sha: string,
    filePath: string,
    signal: AbortSignal
  ): Promise<string> {
    try {
      return await this.execGit(['show', `${sha}:${filePath}`], signal);
    } catch {
      return '';
    }
  }

  /**
   * Creates a graph node for a workspace-relative file path.
   */
  private _createNode(filePath: string): IGraphNode {
    return {
      id: filePath,
      label: path.basename(filePath),
      color: getFileColor(path.extname(filePath)),
    };
  }

  /**
   * Returns the absolute path to the cache directory.
   */
  private _getCacheDir(): string | null {
    if (!this._context.storageUri) {
      return null;
    }
    return vscode.Uri.joinPath(this._context.storageUri, 'git-cache').fsPath;
  }

  /**
   * Returns the absolute cache file path for a given commit SHA.
   */
  private _getCachePath(sha: string): string | null {
    const dir = this._getCacheDir();
    if (!dir) {
      return null;
    }
    return path.join(dir, `${sha}.json`);
  }

  /**
   * Writes graph data to disk cache for a commit.
   */
  private async _cacheGraphData(sha: string, graphData: IGraphData): Promise<void> {
    const cachePath = this._getCachePath(sha);
    if (!cachePath) {
      return;
    }

    const dir = this._getCacheDir()!;
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(cachePath, JSON.stringify(graphData), 'utf-8');
  }

  /**
   * Creates an AbortError for consistent error handling.
   */
  private _createAbortError(): Error {
    const error = new Error('Indexing aborted');
    error.name = 'AbortError';
    return error;
  }
}
