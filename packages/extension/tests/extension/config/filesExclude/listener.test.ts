import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { registerFilesExcludeConfigHandler } from '../../../../src/extension/config/filesExclude/listener';

describe('config/filesExclude/listener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes discovery for a resource-scoped files.exclude change', () => {
    const context = { subscriptions: [] as vscode.Disposable[] };
    const provider = {
      clearCacheAndRefresh: vi.fn(async () => undefined),
      invalidateTimelineCache: vi.fn(async () => undefined),
    };
    registerFilesExcludeConfigHandler(context as vscode.ExtensionContext, provider);
    const listener = vi.mocked(vscode.workspace.onDidChangeConfiguration).mock.calls[0]?.[0];

    listener?.({
      affectsConfiguration: (section: string, resource?: vscode.Uri) =>
        section === 'files.exclude' && resource === vscode.workspace.workspaceFolders?.[0]?.uri,
    } as vscode.ConfigurationChangeEvent);

    expect(provider.clearCacheAndRefresh).toHaveBeenCalledOnce();
    expect(provider.invalidateTimelineCache).toHaveBeenCalledOnce();
  });

  it('ignores unrelated native configuration changes', () => {
    const context = { subscriptions: [] as vscode.Disposable[] };
    const provider = {
      clearCacheAndRefresh: vi.fn(async () => undefined),
      invalidateTimelineCache: vi.fn(async () => undefined),
    };
    registerFilesExcludeConfigHandler(context as vscode.ExtensionContext, provider);
    const listener = vi.mocked(vscode.workspace.onDidChangeConfiguration).mock.calls[0]?.[0];

    listener?.({ affectsConfiguration: () => false } as vscode.ConfigurationChangeEvent);

    expect(provider.clearCacheAndRefresh).not.toHaveBeenCalled();
    expect(provider.invalidateTimelineCache).not.toHaveBeenCalled();
  });
});
