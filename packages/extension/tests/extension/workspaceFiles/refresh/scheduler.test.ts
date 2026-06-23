import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scheduleWorkspaceRefresh } from '../../../../src/extension/workspaceFiles/refresh/scheduler';

const performanceMocks = vi.hoisted(() => ({
  record: vi.fn(),
}));

vi.mock('../../../../src/extension/performance/marks', () => ({
  recordExtensionPerformanceEvent: performanceMocks.record,
}));

function makeProvider() {
  return {
    refreshChangedFiles: vi.fn().mockResolvedValue(undefined),
    refreshGitignoreMetadata: vi.fn().mockResolvedValue(undefined),
    refreshIndex: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    invalidateWorkspaceFiles: vi.fn(() => []),
    isGraphOpen: vi.fn(() => true),
    markWorkspaceRefreshPending: vi.fn(),
  };
}

describe('workspaceFiles/refresh/scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    performanceMocks.record.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces pending refreshes and keeps the latest message', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    delete (provider as Partial<typeof provider>).refreshChangedFiles;
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    scheduleWorkspaceRefresh(provider as never, '[CodeGraphy] File saved, refreshing graph');
    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File created, refreshing graph',
      ['/workspace/new-file.ts'],
    );
    vi.advanceTimersByTime(500);

    expect(provider.refresh).toHaveBeenCalledOnce();
    expect(provider.invalidateWorkspaceFiles).toHaveBeenCalledWith(['/workspace/new-file.ts']);
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File created, refreshing graph');

    consoleSpy.mockRestore();
  });

  it('coalesces file paths and uses refreshChangedFiles when available', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File saved, refreshing graph',
      ['/workspace/src/a.ts'],
    );
    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File created, refreshing graph',
      ['/workspace/src/b.ts'],
    );
    vi.advanceTimersByTime(500);

    expect(provider.refreshChangedFiles).toHaveBeenCalledOnce();
    expect(provider.refreshChangedFiles).toHaveBeenCalledWith([
      '/workspace/src/b.ts',
      '/workspace/src/a.ts',
    ]);
    expect(provider.invalidateWorkspaceFiles).not.toHaveBeenCalled();
    expect(provider.refresh).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File created, refreshing graph');

    consoleSpy.mockRestore();
  });

  it('records schedule and fire timing markers', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File changed, refreshing graph',
      ['/workspace/src/a.ts'],
      123,
    );
    vi.advanceTimersByTime(123);

    expect(performanceMocks.record).toHaveBeenCalledWith(
      'workspaceRefresh.scheduled',
      expect.objectContaining({
        delayMs: 123,
        fileCount: 1,
        fullRefresh: false,
        gitignoreRefresh: false,
      }),
    );
    expect(performanceMocks.record).toHaveBeenCalledWith(
      'workspaceRefresh.started',
      expect.objectContaining({
        delayMs: 123,
        fileCount: 1,
        fullRefresh: false,
        gitignoreRefresh: false,
      }),
    );

    consoleSpy.mockRestore();
  });

  it('queues a pending refresh instead of refreshing while the graph is closed', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    provider.isGraphOpen.mockReturnValue(false);

    scheduleWorkspaceRefresh(provider as never, '[CodeGraphy] File saved, refreshing graph');
    vi.advanceTimersByTime(500);

    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.markWorkspaceRefreshPending).toHaveBeenCalledWith(
      '[CodeGraphy] File saved, refreshing graph',
      [],
    );
  });

  it('keeps gitignore refresh intent when queueing while the graph is closed', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    provider.isGraphOpen.mockReturnValue(false);

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] .gitignore changed, refreshing graph',
      ['/workspace/.gitignore'],
      500,
      { gitignoreRefresh: true },
    );
    vi.advanceTimersByTime(500);

    expect(provider.refreshGitignoreMetadata).not.toHaveBeenCalled();
    expect(provider.markWorkspaceRefreshPending).toHaveBeenCalledWith(
      '[CodeGraphy] .gitignore changed, refreshing graph',
      ['/workspace/.gitignore'],
      { gitignoreRefresh: true },
    );
  });

  it('defaults to refreshing when the provider has no graph-open probe', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    delete (provider as Partial<typeof provider>).isGraphOpen;

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File changed, refreshing graph',
      ['/workspace/src/a.ts'],
    );
    vi.advanceTimersByTime(500);

    expect(provider.markWorkspaceRefreshPending).not.toHaveBeenCalled();
    expect(provider.refreshChangedFiles).toHaveBeenCalledWith(['/workspace/src/a.ts']);
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File changed, refreshing graph');

    consoleSpy.mockRestore();
  });

  it('moves a scheduled refresh back to pending when the graph closes before the timer fires', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    provider.isGraphOpen
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File changed, refreshing graph',
      ['/workspace/src/a.ts'],
    );
    vi.advanceTimersByTime(500);

    expect(provider.markWorkspaceRefreshPending).toHaveBeenCalledWith(
      '[CodeGraphy] File changed, refreshing graph',
      ['/workspace/src/a.ts'],
    );
    expect(provider.refresh).not.toHaveBeenCalled();
  });

  it('falls back to invalidateWorkspaceFiles and refresh when changed-file refresh is unavailable', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    delete (provider as Partial<typeof provider>).refreshChangedFiles;
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] File deleted, refreshing graph',
      ['/workspace/src/a.ts'],
    );
    vi.advanceTimersByTime(500);

    expect(provider.invalidateWorkspaceFiles).toHaveBeenCalledWith(['/workspace/src/a.ts']);
    expect(provider.refresh).toHaveBeenCalledOnce();
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File deleted, refreshing graph');

    consoleSpy.mockRestore();
  });

  it('uses metadata refresh for gitignore refreshes so node visuals update without analysis', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] .gitignore changed, refreshing graph',
      ['/workspace/.gitignore'],
      500,
      { gitignoreRefresh: true },
    );
    vi.advanceTimersByTime(500);

    expect(provider.refreshGitignoreMetadata).toHaveBeenCalledOnce();
    expect(provider.refreshIndex).not.toHaveBeenCalled();
    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.refreshChangedFiles).not.toHaveBeenCalled();
    expect(provider.invalidateWorkspaceFiles).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] .gitignore changed, refreshing graph');

    consoleSpy.mockRestore();
  });

  it('falls back to index refresh for gitignore refreshes without a metadata refresh method', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    delete (provider as Partial<typeof provider>).refreshGitignoreMetadata;

    scheduleWorkspaceRefresh(
      provider as never,
      '[CodeGraphy] .gitignore changed, refreshing graph',
      ['/workspace/.gitignore'],
      500,
      { gitignoreRefresh: true },
    );
    vi.advanceTimersByTime(500);

    expect(provider.refreshIndex).toHaveBeenCalledOnce();
    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.refreshChangedFiles).not.toHaveBeenCalled();
  });

  it('does not throw when fallback invalidation is unavailable', () => {
    vi.useFakeTimers();
    const provider = makeProvider();
    delete (provider as Partial<typeof provider>).refreshChangedFiles;
    delete (provider as Partial<typeof provider>).invalidateWorkspaceFiles;

    expect(() =>
      scheduleWorkspaceRefresh(
        provider as never,
        '[CodeGraphy] File deleted, refreshing graph',
        ['/workspace/src/a.ts'],
      ),
    ).not.toThrow();

    vi.advanceTimersByTime(500);

    expect(provider.refresh).toHaveBeenCalledOnce();
  });

  it('does not throw when the provider cannot mark a pending refresh', () => {
    const provider = makeProvider();
    provider.isGraphOpen.mockReturnValue(false);
    delete (provider as Partial<typeof provider>).markWorkspaceRefreshPending;

    expect(() =>
      scheduleWorkspaceRefresh(
        provider as never,
        '[CodeGraphy] File saved, refreshing graph',
      ),
    ).not.toThrow();
  });
});
