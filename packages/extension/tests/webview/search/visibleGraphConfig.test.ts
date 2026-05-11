import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../src/shared/graph/contracts';
import { deriveVisibleGraph } from '../../../src/shared/visibleGraph';
import { buildVisibleGraphConfig } from '../../../src/webview/search/visibleGraphConfig';

describe('webview/search/visibleGraphConfig', () => {
  it('maps graph layout collapsed nodes into visible graph collapse config', () => {
    expect(buildVisibleGraphConfig({
      graphLayout: { collapsedNodes: { src: true, tests: false }, pinnedNodes: {} },
      searchOptions: { matchCase: false, wholeWord: false, regex: false },
      searchQuery: '',
      showOrphans: true,
    })).toMatchObject({
      collapse: { collapsedNodeIds: ['src'] },
    });
  });

  it('keeps collapse projection active before the first folder is collapsed', () => {
    const graphData: IGraphData = {
      nodes: [
        { id: 'src', label: 'src', color: '#94a3b8', nodeType: 'folder' },
        { id: 'src/app.ts', label: 'app.ts', color: '#38bdf8', nodeType: 'file' },
      ],
      edges: [],
    };

    const result = deriveVisibleGraph(graphData, buildVisibleGraphConfig({
      graphLayout: { collapsedNodes: {}, pinnedNodes: {} },
      searchOptions: { matchCase: false, wholeWord: false, regex: false },
      searchQuery: '',
      showOrphans: true,
    })).graphData;

    expect(result.nodes.find((node) => node.id === 'src')).toMatchObject({
      isCollapsible: true,
      isCollapsed: false,
    });
  });
});
