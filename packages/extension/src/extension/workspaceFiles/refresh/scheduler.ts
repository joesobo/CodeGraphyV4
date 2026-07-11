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

export {
  armWorkspaceRefreshIdleWait,
  waitForWorkspaceRefreshIdle,
  type ArmedWorkspaceRefreshIdleWait,
} from './drain';

interface WatcherMetricTiming {
  emit: ActivePerfMetricEmitter;
  now: () => number;
  startedAt: number;
}

interface PendingWorkspaceRefresh {
  delayMs: number;
  eventCount: number;
  filePaths: Set<string>;
  followUpDelayMs?: number;
  followUpFilePaths: Set<string>;
  fullRefresh: boolean;
  gitignoreRefresh: boolean;
  logMessage: string;
  timeout?: ReturnType<typeof setTimeout>;
  watcherMetricTiming?: WatcherMetricTiming;
}

interface ScheduleWorkspaceRefreshOptions {
  followUpDelayMs?: number;
  followUpFilePaths?: readonly string[];
  fullRefresh?: boolean;
  gitignoreRefresh?: boolean;
  now?: () => number;
}

const pendingWorkspaceRefreshes = new WeakMap<GraphViewProvider, PendingWorkspaceRefresh>();
const activeWorkspaceRefreshes = new WeakMap<GraphViewProvider, Promise<unknown>>();
const LARGE_BURST_EVENT_THRESHOLD = 20;
const LARGE_BURST_QUIET_WINDOW_MS = 250;

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
  const followUpFilePaths = new Set(
    followUpDelayMs === undefined
      ? []
      : (options.followUpFilePaths ?? filePaths),
  );
  let fullRefresh = options.fullRefresh === true;
  let gitignoreRefresh = options.gitignoreRefresh === true;
  let refreshDelayMs = delayMs;
  let eventCount = 1;

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
    if (pending.timeout !== undefined) {
      clearTimeout(pending.timeout);
    }
    refreshDelayMs = Math.min(refreshDelayMs, pending.delayMs);
    eventCount += pending.eventCount;
    followUpDelayMs = maxFollowUpDelay(followUpDelayMs, pending.followUpDelayMs);
    for (const filePath of pending.followUpFilePaths) {
      followUpFilePaths.add(filePath);
    }
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

  if (eventCount > LARGE_BURST_EVENT_THRESHOLD) {
    refreshDelayMs = Math.max(refreshDelayMs, LARGE_BURST_QUIET_WINDOW_MS);
  }

  const nextPending: PendingWorkspaceRefresh = {
    delayMs: refreshDelayMs,
    eventCount,
    filePaths: nextFilePaths,
    followUpDelayMs,
    followUpFilePaths,
    fullRefresh,
    gitignoreRefresh,
    logMessage,
    watcherMetricTiming,
  };

  pendingWorkspaceRefreshes.set(provider, nextPending);
  if (!activeWorkspaceRefreshes.has(provider)) {
    armPendingWorkspaceRefresh(provider, nextPending, refreshDelayMs);
  }
}

function armPendingWorkspaceRefresh(
  provider: GraphViewProvider,
  pending: PendingWorkspaceRefresh,
  delayMs: number,
): void {
  pending.timeout = setTimeout(() => {
    startPendingWorkspaceRefresh(provider, pending);
  }, delayMs);
}

function startPendingWorkspaceRefresh(
  provider: GraphViewProvider,
  pending: PendingWorkspaceRefresh,
): void {
  if (pendingWorkspaceRefreshes.get(provider) !== pending) {
    return;
  }
  if (activeWorkspaceRefreshes.has(provider)) {
    pending.timeout = undefined;
    return;
  }

  pendingWorkspaceRefreshes.delete(provider);
  pending.timeout = undefined;
  markWorkspaceRefreshStarted(provider);
  if (!isGraphOpen(provider)) {
    markWorkspaceRefreshPending(
      provider,
      pending.logMessage,
      [...pending.filePaths],
      { gitignoreRefresh: pending.gitignoreRefresh },
    );
    settleWorkspaceRefreshIdle(provider);
    return;
  }

  console.log(pending.logMessage);
  if (pending.gitignoreRefresh) {
    if (provider.refreshGitignoreMetadata) {
      startTrackedWorkspaceRefresh(
        provider,
        provider.refreshGitignoreMetadata(),
        pending,
        'gitignore-metadata',
      );
      return;
    }
    if (provider.refreshIndex) {
      startTrackedWorkspaceRefresh(
        provider,
        provider.refreshIndex(),
        pending,
        'gitignore-index',
      );
      return;
    }
  }

  if (pending.fullRefresh) {
    if (provider.refreshIndex) {
      startTrackedWorkspaceRefresh(
        provider,
        provider.refreshIndex(),
        pending,
        'full-refresh-index',
      );
      return;
    }
    startTrackedWorkspaceRefresh(
      provider,
      provider.refresh(),
      pending,
      'full-refresh',
    );
    return;
  }

  if (provider.refreshChangedFiles) {
    startTrackedWorkspaceRefresh(
      provider,
      provider.refreshChangedFiles([...pending.filePaths]),
      pending,
      'changed-files',
    );
    return;
  }

  provider.invalidateWorkspaceFiles?.([...pending.filePaths]);
  startTrackedWorkspaceRefresh(
    provider,
    provider.refresh(),
    pending,
    'fallback-refresh',
  );
}

function startTrackedWorkspaceRefresh(
  provider: GraphViewProvider,
  refresh: Promise<unknown>,
  pending: PendingWorkspaceRefresh,
  dimension: string,
): void {
  activeWorkspaceRefreshes.set(provider, refresh);
  trackWatcherToGraph(
    provider,
    refresh,
    pending.watcherMetricTiming,
    dimension,
  );
  scheduleWorkspaceRefreshFollowUp(provider, pending);

  const resumePendingRefresh = (): void => {
    if (activeWorkspaceRefreshes.get(provider) !== refresh) {
      return;
    }
    activeWorkspaceRefreshes.delete(provider);
    const queued = pendingWorkspaceRefreshes.get(provider);
    if (queued && queued.timeout === undefined) {
      armPendingWorkspaceRefresh(provider, queued, queued.delayMs);
    }
  };
  void refresh.then(resumePendingRefresh, resumePendingRefresh);
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
      [...pending.followUpFilePaths],
      0,
      {
        fullRefresh: pending.fullRefresh,
        gitignoreRefresh: pending.gitignoreRefresh,
      },
    );
  });
}
