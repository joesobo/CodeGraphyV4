import { describe, expect, it, vi } from 'vitest';
import type { GraphTooltipState } from '../../../../src/webview/components/graph/tooltip/state';
import { buildGraphTooltipState, hideGraphTooltipState } from '../../../../src/webview/components/graph/tooltip/state';

describe('graph/tooltip/state', () => {
  it('builds visible tooltip state with plugin actions and file-info request state', () => {
    const result = buildGraphTooltipState({
      nodeId: 'src/app.ts',
      snapshot: {
        nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' }],
        edges: [{ id: 'app-utils', from: 'src/app.ts', to: 'src/utils.ts', kind: 'import', sources: [] }],
      },
      rect: null,
      cachedInfo: null,
      pluginActions: [{ id: 'open-docs', label: 'Open Docs', action: vi.fn() }],
      pluginSections: [{ title: 'Rule', content: 'Value' }],
    });

    expect(result).toEqual({
      tooltipData: {
        visible: true,
        nodeRect: { x: 0, y: 0, radius: 0 },
        path: 'src/app.ts',
        info: null,
        incomingCount: 0,
        outgoingCount: 1,
        pluginActions: [{ id: 'open-docs', label: 'Open Docs', action: expect.any(Function) }],
        pluginSections: [{ title: 'Rule', content: 'Value' }],
      },
      shouldRequestFileInfo: true,
    });
  });

  it('does not request file info for symbol tooltip state', () => {
    const result = buildGraphTooltipState({
      nodeId: 'src/app.ts#ready:function',
      snapshot: {
        nodes: [
          {
            id: 'src/app.ts#ready:function',
            label: 'ready',
            color: '#8B5CF6',
            symbol: {
              id: 'src/app.ts#ready:function',
              filePath: 'src/app.ts',
              name: 'ready',
              kind: 'function',
            },
          },
        ],
        edges: [],
      },
      rect: { x: 1, y: 2, radius: 3 },
      cachedInfo: null,
      pluginSections: [],
    });

    expect(result.tooltipData.symbol).toEqual({
      name: 'ready',
      kind: 'function',
      filePath: 'src/app.ts',
    });
    expect(result.shouldRequestFileInfo).toBe(false);
  });

  it('adds a gitignore tooltip section for gitignored filesystem nodes', () => {
    const result = buildGraphTooltipState({
      nodeId: 'generated/output.ts',
      snapshot: {
        nodes: [{
          id: 'generated/output.ts',
          label: 'output.ts',
          color: '#93C5FD',
          metadata: { gitIgnored: true, gitIgnoredReason: 'Git ignored' },
        }],
        edges: [],
      },
      rect: null,
      cachedInfo: null,
      pluginSections: [],
    });

    expect(result.tooltipData.pluginSections).toEqual([
      { title: 'Git ignored', content: 'Reported ignored by Git' },
    ]);
  });

  it('hides tooltip state and clears plugin-owned UI affordances', () => {
    const previousState: GraphTooltipState = {
      visible: true,
      nodeRect: { x: 1, y: 2, radius: 3 },
      path: 'src/app.ts',
      info: null,
      pluginActions: [{ id: 'open-docs', label: 'Open Docs', action: vi.fn() }],
      pluginSections: [{ title: 'Rule', content: 'Value' }],
    };

    expect(hideGraphTooltipState(previousState)).toEqual({
      visible: false,
      nodeRect: { x: 1, y: 2, radius: 3 },
      path: 'src/app.ts',
      info: null,
      pluginActions: [],
      pluginSections: [],
    });
  });
});
