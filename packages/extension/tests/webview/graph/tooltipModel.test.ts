import { describe, it, expect } from 'vitest';
import type { IFileInfo, IGraphData } from '../../../src/shared/types';
import {
  buildGraphTooltipContext,
  buildGraphTooltipState,
  hideGraphTooltipState,
  type GraphTooltipState,
} from '../../../src/webview/components/graphTooltipModel';

const graphSnapshot: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
    { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9' },
    { id: 'src/other.ts', label: 'other.ts', color: '#FCA5A5' },
  ],
  edges: [
    { id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' },
    { id: 'src/other.ts->src/utils.ts', from: 'src/other.ts', to: 'src/utils.ts' },
  ],
};

const cachedInfo: IFileInfo = {
  path: 'src/app.ts',
  size: 128,
  lastModified: 123456,
  plugin: 'typescript',
  incomingCount: 2,
  outgoingCount: 1,
  visits: 9,
};

describe('graphTooltipModel', () => {
  it('builds tooltip context from the matching snapshot node and its connected neighbors', () => {
    const context = buildGraphTooltipContext({
      node: { id: 'src/app.ts', label: 'hovered.ts', color: '#000000' },
      snapshot: graphSnapshot,
    });

    expect(context).toEqual({
      node: { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
      neighbors: [{ id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9' }],
      edges: [{ id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' }],
    });
  });

  it('falls back to the hovered node when the snapshot does not contain it', () => {
    const context = buildGraphTooltipContext({
      node: { id: 'src/missing.ts', label: 'missing.ts', color: '#CBD5E1' },
      snapshot: graphSnapshot,
    });

    expect(context).toEqual({
      node: { id: 'src/missing.ts', label: 'missing.ts', color: '#CBD5E1' },
      neighbors: [],
      edges: [],
    });
  });

  it('builds tooltip context for incoming edges by returning the source nodes as neighbors', () => {
    const context = buildGraphTooltipContext({
      node: { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9' },
      snapshot: graphSnapshot,
    });

    expect(context).toEqual({
      node: { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9' },
      neighbors: [
        { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
        { id: 'src/other.ts', label: 'other.ts', color: '#FCA5A5' },
      ],
      edges: [
        { id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' },
        { id: 'src/other.ts->src/utils.ts', from: 'src/other.ts', to: 'src/utils.ts' },
      ],
    });
  });

  it('builds visible tooltip state with cached info and plugin sections', () => {
    const result = buildGraphTooltipState({
      nodeId: 'src/app.ts',
      rect: { x: 10, y: 20, radius: 30 },
      cachedInfo,
      pluginSections: [{ title: 'Rule', content: 'Value' }],
    });

    expect(result).toEqual({
      tooltipData: {
        visible: true,
        nodeRect: { x: 10, y: 20, radius: 30 },
        path: 'src/app.ts',
        info: cachedInfo,
        pluginSections: [{ title: 'Rule', content: 'Value' }],
      },
      shouldRequestFileInfo: false,
    });
  });

  it('builds visible tooltip state with a zero rect fallback and requests file info when cache is missing', () => {
    const result = buildGraphTooltipState({
      nodeId: 'src/app.ts',
      rect: null,
      cachedInfo: null,
      pluginSections: [],
    });

    expect(result).toEqual({
      tooltipData: {
        visible: true,
        nodeRect: { x: 0, y: 0, radius: 0 },
        path: 'src/app.ts',
        info: null,
        pluginSections: [],
      },
      shouldRequestFileInfo: true,
    });
  });

  it('hides tooltip state while preserving the last node anchor and info', () => {
    const previousState: GraphTooltipState = {
      visible: true,
      nodeRect: { x: 10, y: 20, radius: 30 },
      path: 'src/app.ts',
      info: cachedInfo,
      pluginSections: [{ title: 'Rule', content: 'Value' }],
    };

    expect(hideGraphTooltipState(previousState)).toEqual({
      visible: false,
      nodeRect: { x: 10, y: 20, radius: 30 },
      path: 'src/app.ts',
      info: cachedInfo,
      pluginSections: [],
    });
  });
});
