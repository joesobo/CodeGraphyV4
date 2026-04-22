/**
 * @fileoverview Analyzes git history for the timeline feature.
 * Builds per-commit graph data using diff-based incremental analysis
 * and caches results to disk for fast subsequent loads.
 * @module extension/GitHistoryAnalyzer
 */

import * as vscode from 'vscode';
import { minimatch } from 'minimatch';
import { PluginRegistry } from '../../core/plugins/registry/manager';
import type { IGraphData } from '../../shared/graph/contracts';
import type { ICommitInfo } from '../../shared/timeline/contracts';
import {
  clearCachedCommitState,
  getCachedCommitList as getStoredCommitList,
  hasCachedTimeline as hasStoredTimeline,
  persistCachedCommitState,
} from './cache/state';
import { readCachedGraphData, removeGitCacheDir, writeCachedGraphData } from './cache/storage';
import { getCommitList as getTimelineCommitList } from './commits/list';
import { analyzeDiffCommitGraph } from './diff/analysis';
import { execGitCommand } from './exec';
import { getCommitTreeFiles, getDiffNameStatus, getFileAtCommit } from './files';
import { analyzeFullCommitGraph } from './fullCommitAnalysis';
import { indexGitHistory } from './indexer';

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
   * Retrieves the list of commits on the default branch, ordered oldest-first.
   *
   * @param maxCommits - Maximum number of commits to retrieve
   * @param signal - AbortSignal to cancel the operation
   * @returns Array of ICommitInfo ordered oldest-first
   */
  async getCommitList(maxCommits: number, signal: AbortSignal): Promise<ICommitInfo[]> {
    return getTimelineCommitList(
      {
        execGit: (args, abortSignal) => this._execGit(args, abortSignal),
      },
      maxCommits,
      signal
    );
  }

  /**
   * Returns cached graph data for a commit, or empty graph on cache miss.
   *
   * @param sha - The commit SHA to look up
   * @returns Cached IGraphData or empty graph data
   */
  async getGraphDataForCommit(sha: string): Promise<IGraphData> {
    return readCachedGraphData(this._context.storageUri, sha);
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
    return indexGitHistory({
      dependencies: {
        analyzeDiffCommit: (sha, parentSha, previousGraph, abortSignal) =>
          this._analyzeDiffCommit(sha, parentSha, previousGraph, abortSignal),
        analyzeFullCommit: (sha, abortSignal) => this._analyzeFullCommit(sha, abortSignal),
        getCommitList: (limit, abortSignal) => this.getCommitList(limit, abortSignal),
        persistCachedCommitState: (commits) =>
          persistCachedCommitState(
            this._context.workspaceState,
            commits,
            this._getPluginSignature(),
          ),
        writeCachedGraphData: (sha, graphData) =>
          writeCachedGraphData(this._context.storageUri, sha, graphData),
      },
      maxCommits,
      onProgress,
      signal,
    });
  }

  /**
   * Deletes the entire git-cache directory under storageUri.
   */
  async invalidateCache(): Promise<void> {
    await removeGitCacheDir(this._context.storageUri);
    await clearCachedCommitState(this._context.workspaceState);
  }

  /**
   * Checks whether a cached timeline exists in workspaceState.
   */
  hasCachedTimeline(): boolean {
    return hasStoredTimeline(this._context.workspaceState, this._getPluginSignature());
  }

  /**
   * Returns the cached commit list from workspaceState, or null if none.
   */
  getCachedCommitList(): ICommitInfo[] | null {
    return getStoredCommitList(this._context.workspaceState, this._getPluginSignature());
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Fully analyzes a commit by listing all files in its tree.
   */
  private async _analyzeFullCommit(sha: string, signal: AbortSignal): Promise<IGraphData> {
    return analyzeFullCommitGraph({
      allFiles: await getCommitTreeFiles(
        (args, abortSignal) => this._execGit(args, abortSignal),
        sha,
        signal
      ),
      getFileAtCommit: (commitSha, filePath, abortSignal) =>
        this._getFileAtCommit(commitSha, filePath, abortSignal),
      registry: this._registry,
      sha,
      shouldExclude: (filePath) => this._shouldExclude(filePath),
      signal,
      supportedExtensions: new Set(this._registry.getSupportedExtensions()),
      workspaceRoot: this._workspaceRoot,
    });
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
    return analyzeDiffCommitGraph({
      diffOutput: await getDiffNameStatus(
        (args, abortSignal) => this._execGit(args, abortSignal),
        parentSha,
        sha,
        signal
      ),
      commitFiles: await getCommitTreeFiles(
        (args, abortSignal) => this._execGit(args, abortSignal),
        sha,
        signal,
      ),
      getFileAtCommit: (commitSha, filePath, abortSignal) =>
        this._getFileAtCommit(commitSha, filePath, abortSignal),
      previousGraph,
      registry: this._registry,
      sha,
      shouldExclude: (filePath) => this._shouldExclude(filePath),
      signal,
      workspaceRoot: this._workspaceRoot,
    });
  }

  /**
   * Retrieves file content at a specific commit via `git show`.
   */
  private async _getFileAtCommit(
    sha: string,
    filePath: string,
    signal: AbortSignal
  ): Promise<string> {
    return getFileAtCommit(
      (args, abortSignal) => this._execGit(args, abortSignal),
      sha,
      filePath,
      signal
    );
  }

  private _execGit(args: string[], signal?: AbortSignal): Promise<string> {
    return execGitCommand(args, {
      workspaceRoot: this._workspaceRoot,
      signal,
    });
  }

  private _getPluginSignature(): string {
    return this._registry
      .list()
      .map(({ plugin }) => `${plugin.id}@${plugin.version}`)
      .sort((left, right) => left.localeCompare(right))
      .join('|');
  }
}
