import { vi } from 'vitest';

import type { IGraphData } from '../../../../../../src/shared/graph/contracts';

export function createSource(
  overrides: Partial<Record<string, unknown>> = {},
): {
  _analysisController?: AbortController;
  _analysisRequestId: number;
  _analyzer?: {
    registry: {
      notifyWorkspaceReady: ReturnType<typeof vi.fn>;
    };
  };
  _analyzerInitialized: boolean;
  _analyzerInitPromise?: Promise<void>;
  _filterPatterns: string[];
  _disabledPlugins: Set<string>;
  _graphData: IGraphData;
  _rawGraphData: IGraphData;
  _firstAnalysis: boolean;
  _resolveFirstWorkspaceReady?: ReturnType<typeof vi.fn>;
  _firstWorkspaceReadyPromise: Promise<void>;
  _sendMessage: ReturnType<typeof vi.fn>;
  _sendDepthState: ReturnType<typeof vi.fn>;
  _computeMergedGroups: ReturnType<typeof vi.fn>;
  _sendGroupsUpdated: ReturnType<typeof vi.fn>;
  _updateViewContext: ReturnType<typeof vi.fn>;
  _applyViewTransform: ReturnType<typeof vi.fn>;
  _sendPluginStatuses: ReturnType<typeof vi.fn>;
  _sendDecorations: ReturnType<typeof vi.fn>;
  _sendContextMenuItems: ReturnType<typeof vi.fn>;
  _analyzeAndSendData?: () => Promise<void>;
  _doAnalyzeAndSendData?: (signal: AbortSignal, requestId: number) => Promise<void>;
  _markWorkspaceReady?: (graph: IGraphData) => void;
  _isAnalysisStale?: (signal: AbortSignal, requestId: number) => boolean;
  _isAbortError?: (error: unknown) => boolean;
  [key: string]: unknown;
} {
  const firstWorkspaceReadyPromise = Promise.resolve();

  return {
    _analysisController: undefined,
    _analysisRequestId: 7,
    _analyzer: {
      registry: {
        notifyWorkspaceReady: vi.fn(),
      },
    },
    _analyzerInitialized: false,
    _analyzerInitPromise: undefined,
    _filterPatterns: [],
    _disabledPlugins: new Set<string>(),
    _graphData: { nodes: [], edges: [] },
    _rawGraphData: { nodes: [], edges: [] },
    _firstAnalysis: true,
    _resolveFirstWorkspaceReady: vi.fn(),
    _firstWorkspaceReadyPromise: firstWorkspaceReadyPromise,
    _sendMessage: vi.fn(),
    _sendDepthState: vi.fn(),
    _computeMergedGroups: vi.fn(),
    _sendGroupsUpdated: vi.fn(),
    _updateViewContext: vi.fn(),
    _applyViewTransform: vi.fn(),
    _sendPluginStatuses: vi.fn(),
    _sendDecorations: vi.fn(),
    _sendContextMenuItems: vi.fn(),
    ...overrides,
  };
}
