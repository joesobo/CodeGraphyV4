import * as vscode from 'vscode';
import { vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/types';
import type { GraphViewProviderPluginMethodsSource } from '../../../../src/extension/graphView/provider/plugin/methods';

const EMPTY_GRAPH_DATA: IGraphData = { nodes: [], edges: [] };

export function createPluginSource(
  overrides: Partial<GraphViewProviderPluginMethodsSource> = {},
): GraphViewProviderPluginMethodsSource {
  const source = {
    _pluginExtensionUris: new Map<string, vscode.Uri>(),
    _analyzer: {
      registry: {
        list: vi.fn(() => []),
        getPluginAPI: vi.fn(),
        register: vi.fn(),
        initializePlugin: vi.fn(async () => undefined),
        replayReadinessForPlugin: vi.fn(),
      },
      getPluginStatuses: vi.fn(() => []),
    },
    _disabledPlugins: new Set<string>(),
    _groups: [],
    _view: undefined,
    _panels: [],
    _viewRegistry: { getAvailableViews: vi.fn(() => []) } as never,
    _viewContext: { activePlugins: new Set(), depthLimit: 1 } as never,
    _depthMode: false,
    _graphData: EMPTY_GRAPH_DATA,
    _rawGraphData: EMPTY_GRAPH_DATA,
    _decorationManager: {
      getMergedNodeDecorations: vi.fn(() => new Map()),
      getMergedEdgeDecorations: vi.fn(() => new Map()),
    },
    _firstAnalysis: true,
    _webviewReadyNotified: false,
    _analyzerInitialized: true,
    _analyzerInitPromise: undefined,
    _registerBuiltInPluginRoots: vi.fn(),
    _resolveWebviewAssetPath: vi.fn(() => 'asset://icon.svg'),
    _refreshWebviewResourceRoots: vi.fn(),
    _normalizeExternalExtensionUri: vi.fn(uri =>
      typeof uri === 'string' ? vscode.Uri.file(uri) : uri,
    ),
    _sendMessage: vi.fn(),
    _analyzeAndSendData: vi.fn(async () => undefined),
    _invalidateTimelineCache: vi.fn(async () => undefined),
    ...overrides,
  };

  source._graphData ??= EMPTY_GRAPH_DATA;

  return source as GraphViewProviderPluginMethodsSource;
}
