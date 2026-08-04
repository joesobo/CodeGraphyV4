import type { AnalysisCacheTier } from '@codegraphy-dev/core';
import type { IWorkspaceAnalysisCache } from '../cache';
import { loadWorkspaceAnalysisDatabaseCache } from '../database/cache/storage';
import {
  createRuntimeHydrationCacheTiers,
  hasCacheFiles,
  hasHydratedAnalysisCacheTiers,
} from './tiers';

interface WorkspacePipelineCacheAccess {
  get(): IWorkspaceAnalysisCache;
  set(cache: IWorkspaceAnalysisCache): void;
}

function shouldReplaceCache(
  current: IWorkspaceAnalysisCache,
  loaded: IWorkspaceAnalysisCache,
  cacheWasEmptyAtStart: boolean,
): boolean {
  if (cacheWasEmptyAtStart && hasCacheFiles(current)) return false;
  return hasCacheFiles(loaded) || !hasCacheFiles(current);
}

export class WorkspacePipelineCacheHydrator {
  private pending?: Promise<void>;
  private allFactsWorkspaceRoot?: string;

  async hydrate(
    workspaceRoot: string,
    requestedTiers: readonly AnalysisCacheTier[],
    cache: WorkspacePipelineCacheAccess,
  ): Promise<void> {
    while (!hasHydratedAnalysisCacheTiers(cache.get(), requestedTiers)) {
      if (this.pending) {
        await this.pending;
        continue;
      }
      await this.load(workspaceRoot, requestedTiers, cache);
      return;
    }
  }

  async hydrateAll(
    workspaceRoot: string,
    cache: WorkspacePipelineCacheAccess,
    options: { forceReload?: boolean; rejectUnreadable?: boolean } = {},
  ): Promise<void> {
    if (
      !options.forceReload
      && this.allFactsWorkspaceRoot === workspaceRoot
      && hasCacheFiles(cache.get())
    ) {
      return;
    }
    if (this.pending) {
      await this.pending;
      if (
        !options.forceReload
        && this.allFactsWorkspaceRoot === workspaceRoot
        && hasCacheFiles(cache.get())
      ) {
        return;
      }
    }

    const cacheWasEmptyAtStart = !hasCacheFiles(cache.get());
    const hydration = Promise.resolve()
      .then(() => loadWorkspaceAnalysisDatabaseCache(workspaceRoot, {
        ...(options.rejectUnreadable ? { unreadable: 'throw' as const } : {}),
      }))
      .then((loaded) => {
        if (
          options.forceReload
          || shouldReplaceCache(cache.get(), loaded, cacheWasEmptyAtStart)
        ) {
          cache.set(loaded);
        }
        this.allFactsWorkspaceRoot = workspaceRoot;
      })
      .finally(() => {
        if (this.pending === hydration) this.pending = undefined;
      });
    this.pending = hydration;
    await hydration;
  }

  private async load(
    workspaceRoot: string,
    requestedTiers: readonly AnalysisCacheTier[],
    cache: WorkspacePipelineCacheAccess,
  ): Promise<void> {
    const cacheWasEmptyAtStart = !hasCacheFiles(cache.get());
    const hydration = Promise.resolve()
      .then(() => loadWorkspaceAnalysisDatabaseCache(workspaceRoot, {
        activeAnalysisCacheTiers: createRuntimeHydrationCacheTiers(cache.get(), requestedTiers),
      }))
      .then((loaded) => {
        if (shouldReplaceCache(cache.get(), loaded, cacheWasEmptyAtStart)) cache.set(loaded);
      })
      .finally(() => {
        if (this.pending === hydration) this.pending = undefined;
      });
    this.pending = hydration;
    await hydration;
  }
}
