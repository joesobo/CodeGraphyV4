import path from 'node:path';
import { matchesAnyPattern } from '../../discovery/pathMatching';
import { resolveWorkspaceRoot } from '../../workspace/paths';
import { readCodeGraphyWorkspaceSettings } from '../../workspace/settings';
import type { IndexCodeGraphyWorkspaceOptions, IndexCodeGraphyWorkspaceResult } from '../contracts';
import { createCodeGraphyWorkspaceEngine } from '../engine';

const DEFAULT_DEBOUNCE_MS = 500;
const DEFAULT_MAX_BATCH_AGE_MS = 2_000;

export type CodeGraphyWorkspaceCacheUpdateEvent =
  | { type: 'ready'; result: IndexCodeGraphyWorkspaceResult }
  | { type: 'updating'; filePaths: readonly string[] }
  | {
      type: 'updated';
      durationMs: number;
      filePaths: readonly string[];
      result: IndexCodeGraphyWorkspaceResult;
    }
  | { type: 'error'; error: unknown; filePaths: readonly string[] };

export interface CodeGraphyWorkspaceCacheUpdaterOptions extends IndexCodeGraphyWorkspaceOptions {
  debounceMs?: number;
  maxBatchAgeMs?: number;
  onEvent?: (event: CodeGraphyWorkspaceCacheUpdateEvent) => void;
}

export interface CodeGraphyWorkspaceCacheUpdater {
  dispose(): Promise<void>;
  notify(filePaths: readonly string[]): void;
  start(): Promise<IndexCodeGraphyWorkspaceResult>;
}

class WorkspaceCacheUpdater implements CodeGraphyWorkspaceCacheUpdater {
  private readonly debounceMs: number;
  private readonly engine;
  private readonly maxBatchAgeMs: number;
  private readonly pendingFilePaths = new Set<string>();
  private readonly workspaceRoot: string;
  private acceptingChanges = true;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private disposePromise: Promise<void> | undefined;
  private flushRequested = false;
  private maxBatchAgeTimer: ReturnType<typeof setTimeout> | undefined;
  private startPromise: Promise<IndexCodeGraphyWorkspaceResult> | undefined;
  private updatePromise: Promise<void> | undefined;

  constructor(private readonly options: CodeGraphyWorkspaceCacheUpdaterOptions) {
    this.engine = createCodeGraphyWorkspaceEngine(options);
    this.workspaceRoot = resolveWorkspaceRoot(options.workspaceRoot);
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.maxBatchAgeMs = options.maxBatchAgeMs ?? DEFAULT_MAX_BATCH_AGE_MS;
  }

  start(): Promise<IndexCodeGraphyWorkspaceResult> {
    if (this.disposed) {
      return Promise.reject(new Error('CodeGraphy Workspace cache updater is disposed.'));
    }
    this.startPromise ??= this.engine.index().then((result) => {
      this.emit({ type: 'ready', result });
      return result;
    });
    return this.startPromise;
  }

  notify(filePaths: readonly string[]): void {
    if (!this.acceptingChanges) return;
    const activePatterns = this.readActiveFilterPatterns();
    for (const filePath of filePaths) {
      if (this.shouldUpdatePath(filePath, activePatterns)) this.pendingFilePaths.add(filePath);
    }
    this.schedule();
  }

  dispose(): Promise<void> {
    this.disposePromise ??= this.drainAndDispose();
    return this.disposePromise;
  }

  private emit(event: CodeGraphyWorkspaceCacheUpdateEvent): void {
    this.options.onEvent?.(event);
  }

  private readActiveFilterPatterns(): string[] {
    try {
      const settings = this.options.settings
        ?? readCodeGraphyWorkspaceSettings(this.workspaceRoot);
      const disabledPatterns = new Set(settings.disabledCustomFilterPatterns);
      return settings.filterPatterns.filter(pattern => !disabledPatterns.has(pattern));
    } catch {
      // The update operation reports malformed settings through the event stream.
      return [];
    }
  }

  private shouldUpdatePath(filePath: string, activePatterns: readonly string[]): boolean {
    const relativePath = path.relative(
      this.workspaceRoot,
      path.resolve(this.workspaceRoot, filePath),
    );
    const normalizedPath = relativePath.split(path.sep).join('/');
    const lifecyclePath = normalizedPath === '.codegraphy/settings.json'
      || path.basename(normalizedPath) === '.gitignore';
    return lifecyclePath || !matchesAnyPattern(normalizedPath, activePatterns);
  }

  private clearBatchTimers(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.maxBatchAgeTimer) clearTimeout(this.maxBatchAgeTimer);
    this.debounceTimer = undefined;
    this.maxBatchAgeTimer = undefined;
  }

  private requestUpdate(): void {
    this.clearBatchTimers();
    if (this.updatePromise) {
      this.flushRequested = true;
      return;
    }
    void this.update();
  }

  private schedule(): void {
    if (this.disposed || this.pendingFilePaths.size === 0) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.requestUpdate(), this.debounceMs);
    this.maxBatchAgeTimer ??= setTimeout(() => this.requestUpdate(), this.maxBatchAgeMs);
  }

  private async update(): Promise<void> {
    if (this.disposed || this.pendingFilePaths.size === 0) return;
    if (this.updatePromise) {
      this.flushRequested = true;
      return;
    }
    this.clearBatchTimers();
    const filePaths = [...this.pendingFilePaths];
    this.pendingFilePaths.clear();
    this.updatePromise = this.applyUpdate(filePaths);
    try {
      await this.updatePromise;
    } finally {
      this.updatePromise = undefined;
      this.continuePendingWork();
    }
  }

  private async applyUpdate(filePaths: readonly string[]): Promise<void> {
    await this.start();
    this.emit({ type: 'updating', filePaths });
    const startedAt = performance.now();
    try {
      const result = await this.engine.applyChangedFiles(filePaths);
      this.emit({
        type: 'updated',
        durationMs: performance.now() - startedAt,
        filePaths,
        result,
      });
    } catch (error) {
      this.emit({ type: 'error', error, filePaths });
    }
  }

  private continuePendingWork(): void {
    if (this.flushRequested && this.pendingFilePaths.size > 0) {
      this.flushRequested = false;
      void this.update();
      return;
    }
    this.flushRequested = false;
    this.schedule();
  }

  private async drainAndDispose(): Promise<void> {
    this.acceptingChanges = false;
    this.clearBatchTimers();
    while (this.pendingFilePaths.size > 0 || this.updatePromise) {
      if (!this.updatePromise && this.pendingFilePaths.size > 0) await this.update();
      const activeUpdate = this.updatePromise;
      if (activeUpdate) await activeUpdate;
    }
    this.clearBatchTimers();
    this.disposed = true;
    this.engine.dispose();
  }
}

export function createCodeGraphyWorkspaceCacheUpdater(
  options: CodeGraphyWorkspaceCacheUpdaterOptions,
): CodeGraphyWorkspaceCacheUpdater {
  return new WorkspaceCacheUpdater(options);
}
