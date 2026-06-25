import { vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import type { IPluginStatus } from '../../../../../src/shared/plugins/status';

export function createSource(
  overrides: Partial<Record<string, unknown>> = {},
): {
  _analyzer: {
    hasIndex: ReturnType<typeof vi.fn>;
    rebuildGraph: ReturnType<typeof vi.fn>;
    loadCachedGraph: ReturnType<typeof vi.fn>;
    refreshGitignoreMetadata: ReturnType<typeof vi.fn>;
    refreshAnalysisScope: ReturnType<typeof vi.fn>;
    refreshPluginFiles: ReturnType<typeof vi.fn>;
    getPluginStatuses: ReturnType<typeof vi.fn>;
    registry: { notifyGraphRebuild: ReturnType<typeof vi.fn> };
    clearCache: ReturnType<typeof vi.fn>;
  };
  _analysisController: AbortController | undefined;
  _analysisRequestId: number;
  _disabledPlugins: Set<string>;
  _filterPatterns: string[];
  _rawGraphData: IGraphData;
  _graphData: IGraphData;
  _loadDisabledRulesAndPlugins: ReturnType<typeof vi.fn>;
  _loadGroupsAndFilterPatterns: ReturnType<typeof vi.fn>;
  _loadAndSendData?: ReturnType<typeof vi.fn>;
  _refreshAndSendData?: ReturnType<typeof vi.fn>;
  _incrementalAnalyzeAndSendData?: ReturnType<typeof vi.fn>;
  _analyzeAndSendData: ReturnType<typeof vi.fn>;
  _sendAllSettings: ReturnType<typeof vi.fn>;
  _sendFavorites: ReturnType<typeof vi.fn>;
  _computeMergedGroups: ReturnType<typeof vi.fn>;
  _sendGroupsUpdated: ReturnType<typeof vi.fn>;
  _sendGraphControls: ReturnType<typeof vi.fn>;
  _sendSettings: ReturnType<typeof vi.fn>;
  _sendPhysicsSettings: ReturnType<typeof vi.fn>;
  _updateViewContext: ReturnType<typeof vi.fn>;
  _applyViewTransform: ReturnType<typeof vi.fn>;
  _sendDepthState: ReturnType<typeof vi.fn>;
  _sendPluginStatuses: ReturnType<typeof vi.fn>;
  _sendDecorations: ReturnType<typeof vi.fn>;
  _sendMessage: ReturnType<typeof vi.fn>;
  _rebuildAndSend?: (() => void) | ReturnType<typeof vi.fn> | undefined;
} {
  return {
    _analyzer: {
      hasIndex: vi.fn(() => true),
      rebuildGraph: vi.fn(() => ({ nodes: [], edges: [] } satisfies IGraphData)),
      loadCachedGraph: vi.fn(async () => ({ nodes: [], edges: [] } satisfies IGraphData)),
      refreshGitignoreMetadata: vi.fn(async () => ({ nodes: [], edges: [] } satisfies IGraphData)),
      refreshAnalysisScope: vi.fn(async () => ({ nodes: [], edges: [] } satisfies IGraphData)),
      refreshPluginFiles: vi.fn(async () => ({ nodes: [], edges: [] } satisfies IGraphData)),
      getPluginStatuses: vi.fn(() => [] satisfies IPluginStatus[]),
      registry: { notifyGraphRebuild: vi.fn() },
      clearCache: vi.fn(),
    },
    _analysisController: undefined,
    _analysisRequestId: 0,
    _disabledPlugins: new Set<string>(),
    _filterPatterns: ['src/**'],
    _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    _loadDisabledRulesAndPlugins: vi.fn(() => true),
    _loadGroupsAndFilterPatterns: vi.fn(),
    _loadAndSendData: vi.fn(async () => undefined),
    _incrementalAnalyzeAndSendData: vi.fn(async () => undefined),
    _analyzeAndSendData: vi.fn(async () => undefined),
    _sendAllSettings: vi.fn(),
    _sendFavorites: vi.fn(),
    _computeMergedGroups: vi.fn(),
    _sendGroupsUpdated: vi.fn(),
    _sendGraphControls: vi.fn(),
    _sendSettings: vi.fn(),
    _sendPhysicsSettings: vi.fn(),
    _updateViewContext: vi.fn(),
    _applyViewTransform: vi.fn(),
    _sendDepthState: vi.fn(),
    _sendPluginStatuses: vi.fn(),
    _sendDecorations: vi.fn(),
    _sendMessage: vi.fn(),
    ...overrides,
  };
}
