import type { GraphViewProvider } from '../../graphViewProvider';

interface WorkspaceRefreshIdleWaiter {
  quietMs: number;
  quietTimeout?: ReturnType<typeof setTimeout>;
  reject: (error: unknown) => void;
  resolve: () => void;
}

interface WorkspaceRefreshActivity {
  error?: unknown;
  followUpTimeouts: Set<ReturnType<typeof setTimeout>>;
  inFlightRefreshes: Set<Promise<unknown>>;
  pending: boolean;
  waiters: Set<WorkspaceRefreshIdleWaiter>;
}

const workspaceRefreshActivities = new WeakMap<GraphViewProvider, WorkspaceRefreshActivity>();

function getWorkspaceRefreshActivity(provider: GraphViewProvider): WorkspaceRefreshActivity {
  const existing = workspaceRefreshActivities.get(provider);
  if (existing) {
    return existing;
  }

  const activity: WorkspaceRefreshActivity = {
    followUpTimeouts: new Set(),
    inFlightRefreshes: new Set(),
    pending: false,
    waiters: new Set(),
  };
  workspaceRefreshActivities.set(provider, activity);
  return activity;
}

function isWorkspaceRefreshBusy(activity: WorkspaceRefreshActivity): boolean {
  return activity.pending
    || activity.followUpTimeouts.size > 0
    || activity.inFlightRefreshes.size > 0;
}

export function settleWorkspaceRefreshIdle(provider: GraphViewProvider): void {
  const activity = workspaceRefreshActivities.get(provider);
  if (!activity || isWorkspaceRefreshBusy(activity)) {
    return;
  }

  const waiters = [...activity.waiters];
  if (activity.error !== undefined && waiters.length === 0) {
    return;
  }

  if (activity.error !== undefined) {
    workspaceRefreshActivities.delete(provider);
    for (const waiter of waiters) {
      if (waiter.quietTimeout !== undefined) {
        clearTimeout(waiter.quietTimeout);
      }
      waiter.reject(activity.error);
    }
    return;
  }

  for (const waiter of waiters) {
    if (waiter.quietMs === 0) {
      activity.waiters.delete(waiter);
      waiter.resolve();
      continue;
    }
    if (waiter.quietTimeout !== undefined) {
      continue;
    }
    waiter.quietTimeout = setTimeout(() => {
      waiter.quietTimeout = undefined;
      if (isWorkspaceRefreshBusy(activity)) {
        return;
      }
      activity.waiters.delete(waiter);
      waiter.resolve();
      if (activity.waiters.size === 0) {
        workspaceRefreshActivities.delete(provider);
      }
    }, waiter.quietMs);
  }

  if (activity.waiters.size === 0) {
    workspaceRefreshActivities.delete(provider);
  }
}

export function interruptWorkspaceRefreshQuietWindow(provider: GraphViewProvider): void {
  const activity = workspaceRefreshActivities.get(provider);
  if (!activity) {
    return;
  }

  for (const waiter of activity.waiters) {
    if (waiter.quietTimeout !== undefined) {
      clearTimeout(waiter.quietTimeout);
      waiter.quietTimeout = undefined;
    }
  }
}

export function markWorkspaceRefreshScheduled(provider: GraphViewProvider): void {
  getWorkspaceRefreshActivity(provider).pending = true;
}

export function markWorkspaceRefreshStarted(provider: GraphViewProvider): void {
  const activity = workspaceRefreshActivities.get(provider);
  if (activity) {
    activity.pending = false;
  }
}

export function trackWorkspaceRefresh(
  provider: GraphViewProvider,
  refresh: Promise<unknown>,
  onSettled: () => void,
): void {
  const activity = getWorkspaceRefreshActivity(provider);
  activity.inFlightRefreshes.add(refresh);

  const finish = (error?: unknown): void => {
    onSettled();
    activity.inFlightRefreshes.delete(refresh);
    if (error !== undefined) {
      activity.error = error;
    }
    settleWorkspaceRefreshIdle(provider);
  };

  void refresh.then(
    () => finish(),
    error => finish(error),
  );
}

export function trackWorkspaceRefreshFollowUp(
  provider: GraphViewProvider,
  delayMs: number,
  followUp: () => void,
): void {
  const activity = getWorkspaceRefreshActivity(provider);
  const timeout = setTimeout(() => {
    activity.followUpTimeouts.delete(timeout);
    followUp();
    settleWorkspaceRefreshIdle(provider);
  }, delayMs);
  activity.followUpTimeouts.add(timeout);
}

export function waitForWorkspaceRefreshIdle(
  provider: GraphViewProvider,
  options: { quietMs?: number } = {},
): Promise<void> {
  const activity = getWorkspaceRefreshActivity(provider);
  const idle = new Promise<void>((resolve, reject) => {
    activity.waiters.add({
      quietMs: Math.max(0, options.quietMs ?? 0),
      reject,
      resolve,
    });
  });
  settleWorkspaceRefreshIdle(provider);
  return idle;
}
