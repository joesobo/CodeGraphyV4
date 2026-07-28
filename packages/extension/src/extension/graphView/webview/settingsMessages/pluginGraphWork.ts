import type {
  CodeGraphyWorkspacePluginIndexingPlan,
  CodeGraphyWorkspacePluginSettingUpdateIndexingPlan,
} from '@codegraphy-dev/core';

export type PluginGraphWorkRequest = CodeGraphyWorkspacePluginIndexingPlan;

export interface PluginGraphWorkHandlers {
  reloadCachedGraph(): Promise<void>;
  smartRebuild(pluginId: string): void;
}

export interface PluginGraphWorkPlanHandlers extends PluginGraphWorkHandlers {
  schedulePluginGraphWork?(request: PluginGraphWorkRequest): void;
}

export interface PluginGraphWorkScheduler {
  schedule(request: PluginGraphWorkRequest): void;
  cancel(): void;
}

interface PluginGraphWorkSchedulerOptions {
  delayMs?: number;
}

interface PendingPluginGraphWork {
  pending: true;
}

const DEFAULT_PLUGIN_GRAPH_WORK_DELAY_MS = 150;

export function createPluginGraphWorkScheduler(
  handlers: PluginGraphWorkHandlers,
  options: PluginGraphWorkSchedulerOptions = {},
): PluginGraphWorkScheduler {
  const delayMs = options.delayMs ?? DEFAULT_PLUGIN_GRAPH_WORK_DELAY_MS;
  let pending: PendingPluginGraphWork | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const clearPendingTimeout = (): void => {
    if (!timeout) {
      return;
    }

    clearTimeout(timeout);
    timeout = undefined;
  };

  const schedulePendingWork = (): void => {
    clearPendingTimeout();
    timeout = setTimeout(() => {
      const work = pending;
      pending = undefined;
      timeout = undefined;
      if (!work) {
        return;
      }

      void runPluginGraphWork(handlers, work).catch(error => {
        console.error('[CodeGraphy] Scheduled plugin graph refresh failed:', error);
      });
    }, delayMs);
  };

  return {
    schedule(request) {
      if (request.kind === 'projection-only') {
        return;
      }

      pending = mergePluginGraphWork(pending, request);
      schedulePendingWork();
    },
    cancel() {
      clearPendingTimeout();
      pending = undefined;
    },
  };
}

export async function applyPluginGraphWorkPlan(
  plan: CodeGraphyWorkspacePluginSettingUpdateIndexingPlan,
  pluginId: string,
  handlers: PluginGraphWorkPlanHandlers,
): Promise<void> {
  if (plan.kind === 'settings-only') {
    return;
  }

  if (plan.kind === 'projection-only') {
    handlers.smartRebuild(pluginId);
    return;
  }

  if (handlers.schedulePluginGraphWork) {
    handlers.schedulePluginGraphWork(plan);
    return;
  }

  await runPluginGraphWork(handlers, {
    pending: true,
  });
}

async function runPluginGraphWork(
  handlers: PluginGraphWorkHandlers,
  _work: PendingPluginGraphWork,
): Promise<void> {
  await handlers.reloadCachedGraph();
}

function mergePluginGraphWork(
  pending: PendingPluginGraphWork | undefined,
  _request: Exclude<PluginGraphWorkRequest, { kind: 'projection-only' }>,
): PendingPluginGraphWork {
  return pending ?? { pending: true };
}
