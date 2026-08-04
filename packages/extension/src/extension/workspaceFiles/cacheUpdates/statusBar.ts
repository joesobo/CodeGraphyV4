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
  statusBarItem.tooltip = status.detail;
  statusBarItem.show();
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
      return status.fileCount === 1
        ? '$(sync~spin) CodeGraphy: Updating 1 file'
        : `$(sync~spin) CodeGraphy: Updating ${status.fileCount} files`;
    case 'error':
      return '$(error) CodeGraphy: Cache update failed';
  }
}
