/**
 * @fileoverview Additional tests for configListener targeting surviving mutants.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { registerConfigHandler } from '../../../src/extension/config/listener';

function makeProvider() {
  return {
    refreshPhysicsSettings: vi.fn(),
    refreshToggleSettings: vi.fn(),
    refreshSettings: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
    emitEvent: vi.fn(),
    invalidateTimelineCache: vi.fn().mockResolvedValue(undefined),
    sendPlaybackSpeed: vi.fn(),
  };
}

function makeContext() {
  return {
    subscriptions: [] as { dispose: () => void }[],
  };
}

function getConfigListener() {
  const mock = vscode.workspace.onDidChangeConfiguration as unknown as {
    mock: { calls: unknown[][] };
  };
  return mock.mock.calls[0]?.[0] as (event: { affectsConfiguration: (key: string) => boolean }) => void;
}

describe('configListener (extra mutant coverage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not call any provider method when the event does not affect codegraphy', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const listener = getConfigListener();
    listener({ affectsConfiguration: () => false });

    expect(provider.refreshPhysicsSettings).not.toHaveBeenCalled();
    expect(provider.refreshToggleSettings).not.toHaveBeenCalled();
    expect(provider.refreshSettings).not.toHaveBeenCalled();
    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.emitEvent).not.toHaveBeenCalled();
  });

  it('calls refreshToggleSettings for disabledPlugins changes', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const listener = getConfigListener();
    listener({ affectsConfiguration: (key) => key === 'codegraphy.disabledPlugins' });

    expect(provider.refreshToggleSettings).toHaveBeenCalledOnce();
  });

  it('does not call other refresh methods when physics changes', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const listener = getConfigListener();
    listener({ affectsConfiguration: (key) => key === 'codegraphy.physics' });

    expect(provider.refreshPhysicsSettings).toHaveBeenCalledOnce();
    expect(provider.refreshToggleSettings).not.toHaveBeenCalled();
    expect(provider.refreshSettings).not.toHaveBeenCalled();
    expect(provider.refresh).not.toHaveBeenCalled();
  });

  it('does not invalidate timeline cache for general changes without filterPatterns or maxCommits', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const listener = getConfigListener();
    listener({
      affectsConfiguration: (key) => key === 'codegraphy',
    });

    expect(provider.refresh).toHaveBeenCalledOnce();
    expect(provider.invalidateTimelineCache).not.toHaveBeenCalled();
    expect(provider.sendPlaybackSpeed).not.toHaveBeenCalled();
  });

  it('handles hiddenPluginGroups changes as groups category', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const listener = getConfigListener();
    listener({ affectsConfiguration: (key) => key === 'codegraphy.hiddenPluginGroups' });

    // groups category should not trigger any refresh
    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.refreshPhysicsSettings).not.toHaveBeenCalled();
    expect(provider.refreshToggleSettings).not.toHaveBeenCalled();
    expect(provider.refreshSettings).not.toHaveBeenCalled();
  });

  it('invalidates timeline cache for timeline.maxCommits changes', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const listener = getConfigListener();
    listener({
      affectsConfiguration: (key) =>
        key === 'codegraphy' || key === 'codegraphy.timeline.maxCommits',
    });

    expect(provider.invalidateTimelineCache).toHaveBeenCalledOnce();
  });
});
