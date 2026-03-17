import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { registerConfigHandler } from '../../src/extension/configListener';

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

describe('configListener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls refreshPhysicsSettings for physics configuration changes', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const listener = getConfigListener();
    listener({ affectsConfiguration: (key) => key === 'codegraphy.physics' });

    expect(provider.refreshPhysicsSettings).toHaveBeenCalledOnce();
  });

  it('calls refreshToggleSettings for disabledRules changes', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const listener = getConfigListener();
    listener({ affectsConfiguration: (key) => key === 'codegraphy.disabledRules' });

    expect(provider.refreshToggleSettings).toHaveBeenCalledOnce();
  });

  it('calls refreshSettings for display-only setting changes', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const listener = getConfigListener();
    listener({ affectsConfiguration: (key) => key === 'codegraphy.showLabels' });

    expect(provider.refreshSettings).toHaveBeenCalledOnce();
  });

  it('skips re-analysis for groups configuration changes', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const listener = getConfigListener();
    listener({ affectsConfiguration: (key) => key === 'codegraphy.groups' });

    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.refreshSettings).not.toHaveBeenCalled();
  });

  it('triggers full refresh for unrecognized codegraphy settings', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const listener = getConfigListener();
    listener({ affectsConfiguration: (key) => key === 'codegraphy' || key === 'codegraphy.maxFiles' });

    expect(provider.refresh).toHaveBeenCalledOnce();
    expect(provider.emitEvent).toHaveBeenCalledWith('workspace:configChanged', {
      key: 'codegraphy',
      value: undefined,
      old: undefined,
    });
  });

  it('invalidates timeline cache when filterPatterns change', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const listener = getConfigListener();
    listener({
      affectsConfiguration: (key) =>
        key === 'codegraphy' ||
        key === 'codegraphy.filterPatterns',
    });

    expect(provider.invalidateTimelineCache).toHaveBeenCalledOnce();
  });

  it('sends playback speed when timeline.playbackSpeed changes', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

    const listener = getConfigListener();
    listener({
      affectsConfiguration: (key) =>
        key === 'codegraphy' ||
        key === 'codegraphy.timeline.playbackSpeed',
    });

    expect(provider.sendPlaybackSpeed).toHaveBeenCalledOnce();
  });

  it('adds a subscription to the context', () => {
    const context = makeContext();
    const provider = makeProvider();

    registerConfigHandler(context as unknown as vscode.ExtensionContext, provider as never);

    expect(context.subscriptions.length).toBe(1);
  });
});
