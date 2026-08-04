import { describe, expect, it, vi } from 'vitest';
import { renderWorkspaceCacheUpdateStatus } from '../../../../src/extension/workspaceFiles/cacheUpdates/statusBar';

describe('workspaceFiles/cacheUpdates/statusBar', () => {
  it('shows queued, updating, and failed cache state', () => {
    const statusBarItem = {
      text: '',
      tooltip: '',
      show: vi.fn(),
      hide: vi.fn(),
    };

    renderWorkspaceCacheUpdateStatus(statusBarItem, {
      state: 'queued', fileCount: 2,
    });
    expect(statusBarItem.text).toBe('$(clock) CodeGraphy: 2 changes queued');
    expect(statusBarItem.tooltip).toBe(
      '2 workspace file changes are queued for Graph Cache update.',
    );
    expect(statusBarItem.show).toHaveBeenCalledOnce();

    renderWorkspaceCacheUpdateStatus(statusBarItem, {
      state: 'updating', fileCount: 2,
    });
    expect(statusBarItem.text).toBe('$(sync~spin) CodeGraphy: Updating 2 files');
    expect(statusBarItem.tooltip).toBe('Updating the Graph Cache for 2 workspace files.');

    renderWorkspaceCacheUpdateStatus(statusBarItem, {
      state: 'updating',
      fileCount: 2,
      progress: { phase: 'Applying Changes', current: 1, total: 2 },
    });
    expect(statusBarItem.tooltip).toBe('Applying Changes: 1 of 2.');

    renderWorkspaceCacheUpdateStatus(statusBarItem, {
      state: 'error', fileCount: 2, error: new Error('disk is read-only'),
    });
    expect(statusBarItem.text).toBe('$(error) CodeGraphy: Cache update failed');
    expect(statusBarItem.tooltip).toBe('Graph Cache update failed: disk is read-only');

    renderWorkspaceCacheUpdateStatus(statusBarItem, {
      state: 'idle', fileCount: 0,
    });
    expect(statusBarItem.hide).toHaveBeenCalledOnce();
  });
});
