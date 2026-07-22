import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { WORKSPACE_ANALYSIS_CACHE_VERSION } from '@codegraphy-dev/core';
import { EventBus } from '../../../../src/core/plugins/events/bus';
import { PluginRegistry } from '../../../../src/core/plugins/registry/manager';
import { WorkspacePipelineEngineStateBase } from '../../../../src/extension/pipeline/indexingState/model';

class TestWorkspacePipelineEngineState extends WorkspacePipelineEngineStateBase {
  protected _getWorkspaceRoot(): string | undefined {
    return undefined;
  }

  setWorkspaceRoot(value: string): void {
    this._lastWorkspaceRoot = value;
  }

  setEventBusForTest(eventBus: EventBus): void {
    this.setEventBus(eventBus);
  }

  snapshot() {
    return {
      cache: this._cache,
      discoveredDirectories: this._lastDiscoveredDirectories,
      discoveredFiles: this._lastDiscoveredFiles,
      engineState: this._engineState,
      eventBus: this._eventBus,
      workspaceRoot: this._lastWorkspaceRoot,
    };
  }
}

function createContext(): vscode.ExtensionContext {
  return {
    subscriptions: [],
    extensionUri: vscode.Uri.file('/extension'),
    workspaceState: { get: vi.fn(), update: vi.fn() },
  } as unknown as vscode.ExtensionContext;
}

describe('workspace pipeline indexing state', () => {
  it('owns the pipeline collaborators and initializes the core engine state', () => {
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      configurable: true,
      get: () => undefined,
    });

    const state = new TestWorkspacePipelineEngineState(createContext());
    const snapshot = state.snapshot();

    expect(state.registry).toBeInstanceOf(PluginRegistry);
    expect(state.lastFileAnalysis).toEqual(new Map());
    expect(snapshot.cache).toEqual({ version: WORKSPACE_ANALYSIS_CACHE_VERSION, files: {} });
    expect(snapshot.discoveredDirectories).toEqual([]);
    expect(snapshot.discoveredFiles).toEqual([]);
    expect(snapshot.workspaceRoot).toBe('');
    expect(snapshot.engineState.cache).toBe(snapshot.cache);
  });

  it('keeps compatibility accessors connected to the owned engine state', () => {
    const state = new TestWorkspacePipelineEngineState(createContext());
    const eventBus = new EventBus();

    state.setWorkspaceRoot('/workspace');
    state.setEventBusForTest(eventBus);
    const snapshot = state.snapshot();

    expect(snapshot.engineState.workspaceRoot).toBe('/workspace');
    expect(snapshot.eventBus).toBe(eventBus);
  });
});
