import type { WorkspaceCacheUpdateStatus } from './model';

export interface WorkspaceCacheUpdateStatusBarItem {
  text: string;
  tooltip: unknown;
  hide(): void;
  show(): void;
}

export function renderWorkspaceCacheUpdateStatus(
  statusBarItem: WorkspaceCacheUpdateStatusBarItem,
  status: WorkspaceCacheUpdateStatus,
): void {
  if (status.state === 'idle') {
    statusBarItem.hide();
    return;
  }

  statusBarItem.text = statusBarText(status);
  statusBarItem.tooltip = statusBarTooltip(status);
  statusBarItem.show();
}

function statusBarTooltip(
  status: Exclude<WorkspaceCacheUpdateStatus, { state: 'idle' }>,
): string {
  switch (status.state) {
    case 'queued':
      return status.fileCount === 1
        ? '1 workspace file change is queued for Graph Cache update.'
        : `${status.fileCount} workspace file changes are queued for Graph Cache update.`;
    case 'updating':
      return status.progress
        ? `${status.progress.phase}: ${status.progress.current} of ${status.progress.total}.`
        : status.fileCount === 1
          ? 'Updating the Graph Cache for 1 workspace file.'
          : `Updating the Graph Cache for ${status.fileCount} workspace files.`;
    case 'error':
      return `Graph Cache update failed: ${formatError(status.error)}`;
  }
}

function statusBarText(
  status: Exclude<WorkspaceCacheUpdateStatus, { state: 'idle' }>,
): string {
  switch (status.state) {
    case 'queued':
      return status.fileCount === 1
        ? '$(clock) CodeGraphy: 1 change queued'
        : `$(clock) CodeGraphy: ${status.fileCount} changes queued`;
    case 'updating':
      if (status.progress) {
        return `$(sync~spin) CodeGraphy: ${status.progress.phase} ${status.progress.current}/${status.progress.total}`;
      }
      return status.fileCount === 1
        ? '$(sync~spin) CodeGraphy: Updating 1 file'
        : `$(sync~spin) CodeGraphy: Updating ${status.fileCount} files`;
    case 'error':
      return '$(error) CodeGraphy: Cache update failed';
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
