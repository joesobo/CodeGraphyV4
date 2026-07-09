import {
  captureActivePerfMetricEmitter,
  type ActivePerfMetricEmitter,
} from '@codegraphy-dev/core';
import type { GraphViewProvider } from '../../graphViewProvider';
import {
  interruptWorkspaceRefreshQuietWindow,
  markWorkspaceRefreshScheduled,
  markWorkspaceRefreshStarted,
  settleWorkspaceRefreshIdle,
  trackWorkspaceRefresh,
  trackWorkspaceRefreshFollowUp,
} from './drain';

export { waitForWorkspaceRefreshIdle } from './drain';

interface WatcherMetricTiming {
  emit: ActivePerfMetricEmitter;
  now: () => number;
  startedAt: number;
}

interface PendingWorkspaceRefresh {
  filePaths: Set<string>;
  followUpDelayMs?: number;
  fullRefresh: boolean;
  gitignoreRefresh: boolean;
  logMessage: string;
  timeout: ReturnType<typeof setTimeout>;
  watcherMetricTiming?: WatcherMetricTiming;
}

interface ScheduleWorkspaceRefreshOptions {
  followUpDelayMs?: number;
  fullRefresh?: boolean;
  gitignoreRefresh?: boolean;
  now?: () => number;
}

const pendingWorkspaceRefreshes = new WeakMap<GraphViewProvider, PendingWorkspaceRefresh>();

function isGraphOpen(provider: GraphViewProvider): boolean {
  return provider.isGraphOpen?.() ?? true;
}

function markWorkspaceRefreshPending(
  provider: GraphViewProvider,
  logMessage: string,
  filePaths: readonly string[],
  options: { gitignoreRefresh?: boolean } = {},
): void {
  if (options.gitignoreRefresh !== true) {
    provider.markWorkspaceRefreshPending?.(logMessage, filePaths);
    return;
  }

  provider.markWorkspaceRefreshPending?.(logMessage, filePaths, options);
}

export function scheduleWorkspaceRefresh(
  provider: GraphViewProvider,
  logMessage: string,
  filePaths: readonly string[] = [],
  delayMs: number = 500,
  options: ScheduleWorkspaceRefreshOptions = {},
): void {
  interruptWorkspaceRefreshQuietWindow(provider);
  const now = options.now ?? (() => performance.now());
  const emitMetric = captureActivePerfMetricEmitter();
  let watcherMetricTiming = emitMetric
    ? { emit: emitMetric, now, startedAt: now() }
    : undefined;
  const nextFilePaths = new Set(filePaths);
  let followUpDelayMs = options.followUpDelayMs;
  let fullRefresh = options.fullRefresh === true;
  let gitignoreRefresh = options.gitignoreRefresh === true;

  if (!isGraphOpen(provider)) {
    markWorkspaceRefreshPending(provider, logMessage, [...nextFilePaths], {
      gitignoreRefresh,
    });
    settleWorkspaceRefreshIdle(provider);
    return;
  }

  markWorkspaceRefreshScheduled(provider);
  const pending = pendingWorkspaceRefreshes.get(provider);
  if (pending) {
    clearTimeout(pending.timeout);
    followUpDelayMs = maxFollowUpDelay(followUpDelayMs, pending.followUpDelayMs);
    fullRefresh = fullRefresh || pending.fullRefresh;
    gitignoreRefresh = gitignoreRefresh || pending.gitignoreRefresh;
    if (
      pending.watcherMetricTiming
      && (
        !watcherMetricTiming
        || pending.watcherMetricTiming.startedAt < watcherMetricTiming.startedAt
      )
    ) {
      watcherMetricTiming = pending.watcherMetricTiming;
    }
    for (const filePath of pending.filePaths) {
      nextFilePaths.add(filePath);
    }
  }

  const nextPending: PendingWorkspaceRefresh = {
    filePaths: nextFilePaths,
    followUpDelayMs,
    fullRefresh,
    gitignoreRefresh,
    logMessage,
    timeout: setTimeout(() => {
      pendingWorkspaceRefreshes.delete(provider);
      markWorkspaceRefreshStarted(provider);
      if (!isGraphOpen(provider)) {
        markWorkspaceRefreshPending(
          provider,
          nextPending.logMessage,
          [...nextPending.filePaths],
          { gitignoreRefresh: nextPending.gitignoreRefresh },
        );
        settleWorkspaceRefreshIdle(provider);
        return;
      }

      console.log(nextPending.logMessage);
      if (nextPending.gitignoreRefresh) {
        if (provider.refreshGitignoreMetadata) {
          trackWatcherToGraph(
            provider,
            provider.refreshGitignoreMetadata(),
            nextPending.watcherMetricTiming,
            'gitignore-metadata',
          );
          scheduleWorkspaceRefreshFollowUp(provider, nextPending);
          return;
        }
        if (provider.refreshIndex) {
          trackWatcherToGraph(
            provider,
            provider.refreshIndex(),
            nextPending.watcherMetricTiming,
            'gitignore-index',
          );
          scheduleWorkspaceRefreshFollowUp(provider, nextPending);
          return;
        }
      }

      if (nextPending.fullRefresh) {
        if (provider.refreshIndex) {
          trackWatcherToGraph(
            provider,
            provider.refreshIndex(),
            nextPending.watcherMetricTiming,
            'full-refresh-index',
          );
          scheduleWorkspaceRefreshFollowUp(provider, nextPending);
          return;
        }
        trackWatcherToGraph(
          provider,
          provider.refresh(),
          nextPending.watcherMetricTiming,
          'full-refresh',
        );
        scheduleWorkspaceRefreshFollowUp(provider, nextPending);
        return;
      }

      if (provider.refreshChangedFiles) {
        trackWatcherToGraph(
          provider,
          provider.refreshChangedFiles([...nextPending.filePaths]),
          nextPending.watcherMetricTiming,
          'changed-files',
        );
        scheduleWorkspaceRefreshFollowUp(provider, nextPending);
        return;
      }

      provider.invalidateWorkspaceFiles?.([...nextPending.filePaths]);
      trackWatcherToGraph(
        provider,
        provider.refresh(),
        nextPending.watcherMetricTiming,
        'fallback-refresh',
      );
      scheduleWorkspaceRefreshFollowUp(provider, nextPending);
    }, delayMs),
    watcherMetricTiming,
  };

  pendingWorkspaceRefreshes.set(provider, nextPending);
}

function trackWatcherToGraph(
  provider: GraphViewProvider,
  refresh: Promise<unknown>,
  timing: WatcherMetricTiming | undefined,
  dimension: string,
): void {
  trackWorkspaceRefresh(provider, refresh, () => {
    if (timing) {
      timing.emit({
        metric: 'watcherToGraphMs',
        value: timing.now() - timing.startedAt,
        unit: 'ms',
        dimension,
      });
    }
  });
}

function maxFollowUpDelay(
  left: number | undefined,
  right: number | undefined,
): number | undefined {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return Math.max(left, right);
}

function scheduleWorkspaceRefreshFollowUp(
  provider: GraphViewProvider,
  pending: PendingWorkspaceRefresh,
): void {
  if (pending.followUpDelayMs === undefined) {
    return;
  }

  trackWorkspaceRefreshFollowUp(provider, pending.followUpDelayMs, () => {
    scheduleWorkspaceRefresh(
      provider,
      pending.logMessage,
      [...pending.filePaths],
      0,
      {
        fullRefresh: pending.fullRefresh,
        gitignoreRefresh: pending.gitignoreRefresh,
      },
    );
  });
}
