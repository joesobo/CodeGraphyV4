import { describe, expect, it } from 'vitest';
import type { IGraphData } from '@/shared/graph/contracts';
import {
  createGraphViewProviderMessageReadContext,
} from '../../../../../src/extension/graphView/webview/providerMessages/readContext';

describe('graph view provider listener read context', () => {

  it('returns undefined for missing graph targets and absent provider state', () => {
    const context = createGraphViewProviderMessageReadContext(
      {
        _currentCommitSha: undefined,
        _userGroups: [],
        _depthMode: false,
        _disabledPlugins: new Set(),
        _filterPatterns: [],
        _graphData: { nodes: [], edges: [] } satisfies IGraphData,
        _analyzer: undefined,
        _gitAnalyzer: undefined,
        _viewContext: { activePlugins: new Set(), focusedFile: undefined },
      } as never,
      { workspace: { workspaceFolders: undefined } } as never,
    );

    expect(context.workspaceFolder).toBeUndefined();
    expect(context.getAnalyzer()).toBeUndefined();
    expect(context.getFocusedFile()).toBeUndefined();
    expect(context.findNode('missing')).toBeUndefined();
    expect(context.findEdge('missing')).toBeUndefined();
  });
});
