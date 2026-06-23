import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { EventBus } from '../../../../../src/core/plugins/events/bus';
import { FileDiscovery } from '@codegraphy-dev/core';
import { PluginRegistry } from '../../../../../src/core/plugins/registry/manager';
import { WorkspacePipelineStateBase } from '../../../../../src/extension/pipeline/service/base/state';

const stateBaseHarness = vi.hoisted(() => ({
  loadWorkspaceAnalysisDatabaseCacheAsync: vi.fn(),
  readWorkspaceAnalysisDatabaseSnapshot: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/database/cache/storage.ts', () => ({
  loadWorkspaceAnalysisDatabaseCacheAsync: stateBaseHarness.loadWorkspaceAnalysisDatabaseCacheAsync,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes core collaborators and returns an empty structured snapshot without a workspace root', () => {
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      configurable: true,
      get: () => undefined,
    });

    const state = new TestWorkspacePipelineState(createContext()) as TestWorkspacePipelineState & {
      _cache: unknown;
      _eventBus?: EventBus;
      _lastDiscoveredDirectories: string[];
      _lastDiscoveredFiles: unknown[];
      _lastWorkspaceRoot: string;
    };

    expect(state.registry).toBeInstanceOf(PluginRegistry);
    expect(state.lastFileAnalysis).toEqual(new Map());
    expect(state._lastDiscoveredDirectories).toEqual([]);
    expect(state._lastDiscoveredFiles).toEqual([]);
    expect(state._lastWorkspaceRoot).toBe('');
    expect(state.readStructuredAnalysisSnapshot()).toEqual({
      files: [],
      symbols: [],
      relations: [],
    });
    expect(state._cache).toEqual({
      version: '2.1.0',
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

  it('warms the repo-local Graph Cache using the shared hydration promise', async () => {
    let resolveHydration!: (cache: unknown) => void;
    stateBaseHarness.loadWorkspaceAnalysisDatabaseCacheAsync.mockReturnValueOnce(
      new Promise(resolve => {
        resolveHydration = resolve;
      }),
    );
    const state = new TestWorkspacePipelineState(createContext(), '/workspace') as TestWorkspacePipelineState & {
      _cache: unknown;
      warmGraphCache(): Promise<void>;
    };

    const firstWarm = state.warmGraphCache();
    const secondWarm = state.warmGraphCache();

    expect(stateBaseHarness.loadWorkspaceAnalysisDatabaseCacheAsync).toHaveBeenCalledOnce();
    expect(stateBaseHarness.loadWorkspaceAnalysisDatabaseCacheAsync).toHaveBeenCalledWith('/workspace');

    resolveHydration({
      version: '2.1.0',
      files: {
        'src/app.ts': {
          mtime: 1,
          analysis: { filePath: '/workspace/src/app.ts', relations: [] },
        },
      },
    });

    await Promise.all([firstWarm, secondWarm]);

    expect(state._cache).toEqual({
      version: '2.1.0',
      files: {
        'src/app.ts': {
          mtime: 1,
          analysis: { filePath: '/workspace/src/app.ts', relations: [] },
        },
      },
    });
  });

  it('stores retained indexing fields in the core engine state', () => {
    const state = new TestWorkspacePipelineState(createContext()) as TestWorkspacePipelineState & {
      _cache: { files: Record<string, unknown> };
      _engineState: {
        cache: unknown;
        fileAnalysis: unknown;
        workspaceRoot: string;
      };
      _lastFileAnalysis: Map<string, unknown>;
      _lastWorkspaceRoot: string;
    };
    const fileAnalysis = new Map([['src/a.ts', { filePath: '/workspace/src/a.ts' }]]);

    state._cache = {
      version: 'test',
      files: {
        'src/a.ts': {
          mtime: 1,
          analysis: { filePath: '/workspace/src/a.ts', relations: [] },
        },
      },
    };
    state._lastFileAnalysis = fileAnalysis;
    state._lastWorkspaceRoot = '/workspace';

    expect(state._engineState.cache).toBe(state._cache);
    expect(state._engineState.fileAnalysis).toBe(fileAnalysis);
    expect(state._engineState.workspaceRoot).toBe('/workspace');
  });
});
