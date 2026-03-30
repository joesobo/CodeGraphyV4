import { describe, expect, it } from 'vitest';
import type { IGraphData } from '@/shared/graph/types';
import {
  createGraphViewProviderMessageReadContext,
} from '../../../../../src/extension/graphView/webview/providerMessages/readContext';

describe('graph view provider listener read context', () => {
  it('reads provider state and resolves graph targets from the current graph data', () => {
    const source = {
      _timelineActive: true,
      _currentCommitSha: 'abc123',
      _userGroups: [{ id: 'user:src', pattern: 'src/**', color: '#112233' }],
      _activeViewId: 'codegraphy.depth-graph',
      _disabledPlugins: new Set(['plugin.disabled']),
      _disabledRules: new Set(['rule.disabled']),
      _filterPatterns: ['dist/**'],
      _graphData: {
        nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' }],
        edges: [{ id: 'edge-1', from: 'src/app.ts', to: 'src/lib.ts' }],
      } satisfies IGraphData,
      _viewContext: { activePlugins: new Set(['plugin.enabled']) },
    };
    const dependencies = {
      workspace: {
        workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
      },
    };

    const context = createGraphViewProviderMessageReadContext(
      source as never,
      dependencies as never,
    );

    expect(context.getTimelineActive()).toBe(true);
    expect(context.getCurrentCommitSha()).toBe('abc123');
    expect(context.getUserGroups()).toEqual(source._userGroups);
    expect(context.getActiveViewId()).toBe('codegraphy.depth-graph');
    expect(context.getDisabledPlugins()).toBe(source._disabledPlugins);
    expect(context.getDisabledRules()).toBe(source._disabledRules);
    expect(context.getFilterPatterns()).toEqual(['dist/**']);
    expect(context.getGraphData()).toBe(source._graphData);
    expect(context.getViewContext()).toBe(source._viewContext);
    expect(context.workspaceFolder).toEqual({ uri: { fsPath: '/workspace' } });
    expect(context.findNode('src/app.ts')).toEqual({
      id: 'src/app.ts',
      label: 'app.ts',
      color: '#93C5FD',
    });
    expect(context.findEdge('edge-1')).toEqual({
      id: 'edge-1',
      from: 'src/app.ts',
      to: 'src/lib.ts',
    });
  });
});
