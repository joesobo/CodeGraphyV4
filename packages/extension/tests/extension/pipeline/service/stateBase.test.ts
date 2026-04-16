import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { EventBus } from '../../../../src/core/plugins/events/bus';
import { FileDiscovery } from '../../../../src/core/discovery/file/service';
import { PluginRegistry } from '../../../../src/core/plugins/registry/manager';
import { WorkspacePipelineStateBase } from '../../../../src/extension/pipeline/service/stateBase';

const stateBaseHarness = vi.hoisted(() => ({
  readWorkspaceAnalysisDatabaseSnapshot: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/database/cache.ts', () => ({
  readWorkspaceAnalysisDatabaseSnapshot: stateBaseHarness.readWorkspaceAnalysisDatabaseSnapshot,
}));

class TestWorkspacePipelineState extends WorkspacePipelineStateBase {
  constructor(
    context: vscode.ExtensionContext,
    private readonly workspaceRoot?: string,
  ) {
    super(context);
  }

  protected _getWorkspaceRoot(): string | undefined {
    return this.workspaceRoot;
  }
}

function createContext(): vscode.ExtensionContext {
  return {
    subscriptions: [],
    extensionUri: vscode.Uri.file('/extension'),
    workspaceState: {
      get: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as vscode.ExtensionContext;
}

describe('extension/pipeline/service/stateBase', () => {
  it('initializes core collaborators and returns an empty structured snapshot without a workspace root', () => {
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      configurable: true,
      get: () => undefined,
    });

    const state = new TestWorkspacePipelineState(createContext()) as TestWorkspacePipelineState & {
      _cache: unknown;
      _eventBus?: EventBus;
      _lastDiscoveredFiles: unknown[];
      _lastWorkspaceRoot: string;
    };

    expect(state.registry).toBeInstanceOf(PluginRegistry);
    expect(state.lastFileAnalysis).toEqual(new Map());
    expect(state._lastDiscoveredFiles).toEqual([]);
    expect(state._lastWorkspaceRoot).toBe('');
    expect(state.readStructuredAnalysisSnapshot()).toEqual({
      files: [],
      symbols: [],
      relations: [],
    });
    expect(state._cache).toEqual({
      version: '2.0.0',
      files: {},
    });

    const eventBus = new EventBus();
    state.setEventBus(eventBus);
    expect(state._eventBus).toBe(eventBus);
  });

  it('reads the structured snapshot from the repo-local database when a workspace root exists', () => {
    stateBaseHarness.readWorkspaceAnalysisDatabaseSnapshot.mockReturnValueOnce({
      files: [{ path: 'src/app.ts' }],
      symbols: [{ id: 'symbol-1' }],
      relations: [{ kind: 'import' }],
    });

    const state = new TestWorkspacePipelineState(createContext(), '/workspace');

    expect(state.readStructuredAnalysisSnapshot()).toEqual({
      files: [{ path: 'src/app.ts' }],
      symbols: [{ id: 'symbol-1' }],
      relations: [{ kind: 'import' }],
    });
    expect(stateBaseHarness.readWorkspaceAnalysisDatabaseSnapshot).toHaveBeenCalledWith('/workspace');
  });

  it('creates the discovery service during construction', () => {
    const state = new TestWorkspacePipelineState(createContext()) as TestWorkspacePipelineState & {
      _discovery: FileDiscovery;
    };

    expect(state._discovery).toBeInstanceOf(FileDiscovery);
  });
});
