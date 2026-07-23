import { describe, expect, it } from 'vitest';
import type { IGraphData } from '@/shared/graph/contracts';
import {
  createGraphViewProviderMessageReadContext,
} from '../../../../../src/extension/graphView/webview/providerMessages/readContext';

describe('graph view provider listener read context', () => {
  it('reads provider state', () => {
    const analyzer = {
      getPluginFilterPatterns: () => ['dist/**'],
      lastFileAnalysis: new Map(),
    };
    const source = {
      _userGroups: [{ id: 'user:src', pattern: 'src/**', color: '#112233' }],
      _depthMode: true,
      _disabledPlugins: new Set(['plugin.disabled']),
      _filterPatterns: ['dist/**'],
      _graphData: {
        nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' }],
        edges: [{ id: 'edge-1', from: 'src/app.ts', to: 'src/lib.ts' , kind: 'import', sources: [] }],
      } satisfies IGraphData,
      _analyzer: analyzer,
      _viewContext: { activePlugins: new Set(['plugin.enabled']), focusedFile: 'src/app.ts' },
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

    expect(context.getUserGroups()).toEqual(source._userGroups);
    expect(context.getDepthMode()).toBe(true);
    expect(context.getFilterPatterns()).toEqual(['dist/**']);
    expect(context.getGraphData()).toBe(source._graphData);
    expect(context.getAnalyzer()).toBe(analyzer);
    expect(context.getViewContext()).toBe(source._viewContext);
    expect(context.getFocusedFile()).toBe('src/app.ts');
    expect(context.workspaceFolder).toEqual({ uri: { fsPath: '/workspace' } });
  });

  it('returns undefined for absent provider state', () => {
    const context = createGraphViewProviderMessageReadContext(
      {
        _userGroups: [],
        _depthMode: false,
        _disabledPlugins: new Set(),
        _filterPatterns: [],
        _graphData: { nodes: [], edges: [] } satisfies IGraphData,
        _analyzer: undefined,
        _viewContext: { activePlugins: new Set(), focusedFile: undefined },
      } as never,
      { workspace: { workspaceFolders: undefined } } as never,
    );

    expect(context.workspaceFolder).toBeUndefined();
    expect(context.getAnalyzer()).toBeUndefined();
    expect(context.getFocusedFile()).toBeUndefined();
  });

});
