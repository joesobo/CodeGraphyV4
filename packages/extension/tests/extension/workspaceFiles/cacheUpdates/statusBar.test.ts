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
      state: 'queued', fileCount: 2, detail: '2 files queued.',
    });
    expect(statusBarItem.text).toBe('$(clock) CodeGraphy: 2 changes queued');
    expect(statusBarItem.tooltip).toBe('2 files queued.');
    expect(statusBarItem.show).toHaveBeenCalledOnce();

    renderWorkspaceCacheUpdateStatus(statusBarItem, {
      state: 'updating', fileCount: 2, detail: 'Updating 2 files.',
    });
    expect(statusBarItem.text).toBe('$(sync~spin) CodeGraphy: Updating 2 files');

    renderWorkspaceCacheUpdateStatus(statusBarItem, {
      state: 'error', fileCount: 2, detail: 'Graph Cache update failed.',
    });
    expect(statusBarItem.text).toBe('$(error) CodeGraphy: Cache update failed');

    renderWorkspaceCacheUpdateStatus(statusBarItem, {
      state: 'idle', fileCount: 0, detail: 'Graph Cache is current.',
    });
    expect(statusBarItem.hide).toHaveBeenCalledOnce();
  });
});
