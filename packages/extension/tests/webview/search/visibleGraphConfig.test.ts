import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../src/shared/graph/contracts';
import { deriveVisibleGraph } from '../../../src/shared/visibleGraph';
import { buildVisibleGraphConfig } from '../../../src/webview/search/visibleGraphConfig';

describe('webview/search/visibleGraphConfig', () => {
  it('builds visible graph config without feature-specific collapse state', () => {
    expect(buildVisibleGraphConfig({
      searchOptions: { matchCase: false, wholeWord: false, regex: false },
      searchQuery: '',
      showOrphans: true,
    })).toEqual({
      collapse: undefined,
      filter: undefined,
      scope: { edges: [], nodes: [] },
      search: undefined,
      showOrphans: true,
    });
  });

  it('includes node type defaults so pruned default-hidden symbol types still scope the graph', () => {
    expect(buildVisibleGraphConfig({
      nodeTypes: [
        { id: 'file', label: 'File', defaultColor: '#60a5fa', defaultVisible: true },
        {
          id: 'symbol:class',
          label: 'Class',
          defaultColor: '#3b82f6',
          defaultVisible: false,
          parentId: 'symbol',
        },
      ],
      nodeVisibility: { file: true },
      searchOptions: { matchCase: false, wholeWord: false, regex: false },
      searchQuery: '',
      showOrphans: true,
    }).scope?.nodes).toEqual([
      { type: 'file', enabled: true },
      { type: 'symbol:class', enabled: false },
    ]);
  });

  it('keeps default-hidden class symbols out of an imports-only graph', () => {
    const graphData: IGraphData = {
      nodes: [
        { id: 'src/app.cpp', label: 'app.cpp', color: '#60a5fa', nodeType: 'file' },
        { id: 'src/lib/widget.hpp', label: 'widget.hpp', color: '#60a5fa', nodeType: 'file' },
        {
          id: 'src/app.cpp#Runner:class',
          label: 'Runner',
          color: '#3b82f6',
          nodeType: 'symbol',
          symbol: {
            id: 'src/app.cpp#Runner:class',
            name: 'Runner',
            kind: 'class',
            filePath: 'src/app.cpp',
          },
        },
      ],
      edges: [
        { id: 'src/app.cpp->src/lib/widget.hpp#import', from: 'src/app.cpp', to: 'src/lib/widget.hpp', kind: 'import', sources: [] },
        { id: 'src/app.cpp->src/app.cpp#Runner:class#contains', from: 'src/app.cpp', to: 'src/app.cpp#Runner:class', kind: 'contains', sources: [] },
      ],
    };

    const result = deriveVisibleGraph(graphData, buildVisibleGraphConfig({
      edgeTypes: [
        { id: 'import', label: 'Imports', defaultColor: '#60a5fa', defaultVisible: true },
        { id: 'contains', label: 'Contains', defaultColor: '#8b5cf6', defaultVisible: false },
      ],
      edgeVisibility: { import: true, contains: false },
      nodeTypes: [
        { id: 'file', label: 'File', defaultColor: '#60a5fa', defaultVisible: true },
        { id: 'symbol', label: 'Symbol', defaultColor: '#7c3aed', defaultVisible: false },
        {
          id: 'symbol:class',
          label: 'Class',
          defaultColor: '#3b82f6',
          defaultVisible: false,
          parentId: 'symbol',
        },
      ],
      nodeVisibility: { file: true, symbol: false, 'symbol:class': false },
      searchOptions: { matchCase: false, wholeWord: false, regex: false },
      searchQuery: '',
      showOrphans: true,
    }));

    expect(result.graphData.nodes.map((node) => node.id)).toEqual([
      'src/app.cpp',
      'src/lib/widget.hpp',
    ]);
    expect(result.graphData.edges.map((edge) => edge.kind)).toEqual(['import']);
  });

  it('projects revision diff evidence locally from its edge visibility row', () => {
    const graphData: IGraphData = {
      nodes: [
        { id: 'a', label: 'a', color: '#fff' },
        { id: 'b', label: 'b', color: '#fff' },
      ],
      edges: [{
        id: 'revision-diff:added:a->b#import',
        from: 'a',
        to: 'b',
        kind: 'revision:diff',
        sources: [],
      }],
    };
    const input = {
      edgeTypes: [{
        id: 'revision:diff' as const,
        label: 'Revision changes',
        defaultColor: '#C084FC',
        defaultVisible: false,
      }],
      searchOptions: { matchCase: false, wholeWord: false, regex: false },
      searchQuery: '',
      showOrphans: true,
    };

    expect(deriveVisibleGraph(graphData, buildVisibleGraphConfig(input)).graphData.edges).toEqual([]);
    expect(deriveVisibleGraph(graphData, buildVisibleGraphConfig({
      ...input,
      edgeVisibility: { 'revision:diff': true },
    })).graphData.edges).toEqual(graphData.edges);
  });
});
