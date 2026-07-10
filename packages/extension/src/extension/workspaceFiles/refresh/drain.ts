import type { GraphViewProvider } from '../../graphViewProvider';

interface WorkspaceRefreshIdleWaiter {
  activityOrdinal: number;
  deadlineTimeout?: ReturnType<typeof setTimeout>;
  quietMs: number;
  quietTimeout?: ReturnType<typeof setTimeout>;
  reject: (error: unknown) => void;
  resolve: () => void;
  settlementStarted?: boolean;
  timeoutMs?: number;
}

interface WorkspaceRefreshActivity {
  activityOrdinal: number;
  error?: unknown;
  followUpTimeouts: Set<ReturnType<typeof setTimeout>>;
  inFlightRefreshes: Set<Promise<unknown>>;
  pending: boolean;
  waiters: Set<WorkspaceRefreshIdleWaiter>;
}

export interface ArmedWorkspaceRefreshIdleWait {
  promise: Promise<void>;
  dispose(): void;
}

const workspaceRefreshActivities = new WeakMap<GraphViewProvider, WorkspaceRefreshActivity>();

function getWorkspaceRefreshActivity(provider: GraphViewProvider): WorkspaceRefreshActivity {
  const existing = workspaceRefreshActivities.get(provider);
  if (existing) {
    return existing;
  }

  const activity: WorkspaceRefreshActivity = {
    activityOrdinal: 0,
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

function clearWorkspaceRefreshIdleWaiter(
  activity: WorkspaceRefreshActivity,
  waiter: WorkspaceRefreshIdleWaiter,
): void {
  if (waiter.deadlineTimeout !== undefined) {
    clearTimeout(waiter.deadlineTimeout);
    waiter.deadlineTimeout = undefined;
  }
  if (waiter.quietTimeout !== undefined) {
    clearTimeout(waiter.quietTimeout);
    waiter.quietTimeout = undefined;
  }
  activity.waiters.delete(waiter);
}

function armWorkspaceRefreshIdleDeadline(
  provider: GraphViewProvider,
  activity: WorkspaceRefreshActivity,
  waiter: WorkspaceRefreshIdleWaiter,
  message: string,
): void {
  if (waiter.timeoutMs === undefined) {
    return;
  }
  if (waiter.deadlineTimeout !== undefined) {
    clearTimeout(waiter.deadlineTimeout);
  }
  waiter.deadlineTimeout = setTimeout(() => {
    clearWorkspaceRefreshIdleWaiter(activity, waiter);
    waiter.reject(new Error(message));
    if (activity.waiters.size === 0 && !isWorkspaceRefreshBusy(activity)) {
      workspaceRefreshActivities.delete(provider);
    }
  }, waiter.timeoutMs);
}

export function settleWorkspaceRefreshIdle(provider: GraphViewProvider): void {
  const activity = workspaceRefreshActivities.get(provider);
  if (!activity || isWorkspaceRefreshBusy(activity)) {
    return;
  }

  const waiters = [...activity.waiters].filter(
    waiter => activity.activityOrdinal >= waiter.activityOrdinal,
  );
  if (activity.error !== undefined && waiters.length === 0) {
    return;
  }

  if (activity.error !== undefined) {
    for (const waiter of waiters) {
      clearWorkspaceRefreshIdleWaiter(activity, waiter);
      waiter.reject(activity.error);
    }
    if (activity.waiters.size === 0) {
      workspaceRefreshActivities.delete(provider);
    }
    return;
  }

  for (const waiter of waiters) {
    if (waiter.quietMs === 0) {
      clearWorkspaceRefreshIdleWaiter(activity, waiter);
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
      clearWorkspaceRefreshIdleWaiter(activity, waiter);
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
  const activity = getWorkspaceRefreshActivity(provider);
  activity.activityOrdinal += 1;
  activity.error = undefined;
  activity.pending = true;
  for (const waiter of activity.waiters) {
    if (
      waiter.timeoutMs === undefined
      || waiter.settlementStarted
      || activity.activityOrdinal < waiter.activityOrdinal
    ) {
      continue;
    }
    waiter.settlementStarted = true;
    armWorkspaceRefreshIdleDeadline(
      provider,
      activity,
      waiter,
      'Timed out waiting for workspace refresh activity to settle',
    );
  }
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
      activityOrdinal: activity.activityOrdinal,
      quietMs: Math.max(0, options.quietMs ?? 0),
      reject,
      resolve,
    });
  });
  settleWorkspaceRefreshIdle(provider);
  return idle;
}

export function armWorkspaceRefreshIdleWait(
  provider: GraphViewProvider,
  options: { quietMs?: number; timeoutMs: number },
): ArmedWorkspaceRefreshIdleWait {
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new Error('Workspace refresh idle wait timeout must be positive');
  }

  const activity = getWorkspaceRefreshActivity(provider);
  let waiter!: WorkspaceRefreshIdleWaiter;
  const promise = new Promise<void>((resolve, reject) => {
    waiter = {
      activityOrdinal: activity.activityOrdinal + 1,
      quietMs: Math.max(0, options.quietMs ?? 0),
      reject,
      resolve,
      timeoutMs: options.timeoutMs,
    };
  });
  activity.waiters.add(waiter);
  armWorkspaceRefreshIdleDeadline(
    provider,
    activity,
    waiter,
    'Timed out waiting for future workspace refresh activity to begin',
  );

  return {
    promise,
    dispose(): void {
      clearWorkspaceRefreshIdleWaiter(activity, waiter);
      if (activity.waiters.size === 0 && !isWorkspaceRefreshBusy(activity)) {
        workspaceRefreshActivities.delete(provider);
      }
    },
  };
}
