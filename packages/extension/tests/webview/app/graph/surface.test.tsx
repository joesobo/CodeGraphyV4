import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraphSurface } from '../../../../src/webview/app/graph/surface';

const perfHarness = vi.hoisted(() => ({
  useGraphPerfCommit: vi.fn(),
}));

vi.mock('../../../../src/webview/perf/graph/commit', () => ({
  useGraphPerfCommit: perfHarness.useGraphPerfCommit,
}));

vi.mock('../../../../src/webview/components/graph/view/component', () => ({
  default: ({
    data,
    projectionRevision,
  }: {
    data: { nodes: Array<{ id: string }> };
    projectionRevision?: object;
  }) => (
    <div
      data-testid="graph-surface-graph"
      data-projection-revision={projectionRevision ? 'present' : 'absent'}
    >
      {data.nodes.map((node) => node.id).join(',')}
    </div>
  ),
}));

vi.mock('../../../../src/webview/components/depthViewControls', () => ({
  DepthViewControls: () => <div data-testid="depth-controls" />,
}));

describe('app/graph/surface', () => {
  beforeEach(() => {
    perfHarness.useGraphPerfCommit.mockReset();
  });

  it('renders the graph with colored data when nodes are present', () => {
    const graphData = {
      nodes: [{ id: 'base-node', label: 'Base', color: '#111111' }],
      edges: [],
    };
    const projectionRevision = {};
    render(
      <GraphSurface
        graphData={graphData}
        coloredData={{ nodes: [{ id: 'colored-node', label: 'Colored', color: '#222222' }], edges: [] }}
        projectionRevision={projectionRevision}
        showOrphans
        depthMode={false}
        timelineActive={false}
        theme="light"
        nodeDecorations={{}}
        edgeDecorations={{}}
        pluginHost={undefined}
        onAddFilterRequested={() => {}}
        onAddLegendRequested={() => {}}
      />,
    );

    expect(screen.getByTestId('graph-surface-graph')).toHaveTextContent('colored-node');
    expect(screen.getByTestId('graph-surface-graph'))
      .toHaveAttribute('data-projection-revision', 'present');
    expect(screen.getByTestId('depth-controls')).toBeInTheDocument();
    expect(perfHarness.useGraphPerfCommit).toHaveBeenCalledWith({
      edgeCount: 0,
      enabled: false,
      layoutKey: undefined,
      nodeCount: 0,
      projectionRevision,
      revision: graphData,
    });
  });

  it('renders the empty hint when the graph has no nodes', () => {
    const graphData = { nodes: [], edges: [] };
    const projectionRevision = {};
    render(
      <GraphSurface
        graphData={graphData}
        coloredData={null}
        projectionRevision={projectionRevision}
        showOrphans={false}
        depthMode={false}
        timelineActive={false}
        theme="light"
        nodeDecorations={{}}
        edgeDecorations={{}}
        pluginHost={undefined}
        onAddFilterRequested={() => {}}
        onAddLegendRequested={() => {}}
      />,
    );

    expect(screen.getByText(/All files are hidden/)).toBeInTheDocument();
    expect(perfHarness.useGraphPerfCommit).toHaveBeenCalledWith({
      edgeCount: 0,
      enabled: true,
      layoutKey: undefined,
      nodeCount: 0,
      projectionRevision,
      revision: graphData,
    });
  });

  it('renders the timeline-specific empty hint when the active commit has no graphable files', () => {
    render(
      <GraphSurface
        graphData={{ nodes: [], edges: [] }}
        coloredData={null}
        showOrphans
        depthMode={false}
        timelineActive
        theme="light"
        nodeDecorations={{}}
        edgeDecorations={{}}
        pluginHost={undefined}
        onAddFilterRequested={() => {}}
        onAddLegendRequested={() => {}}
      />,
    );

    expect(screen.getByText(/No files found\. No graphable files exist in this commit\./)).toBeInTheDocument();
  });
});
