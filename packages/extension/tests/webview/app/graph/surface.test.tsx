import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraphSurface } from '../../../../src/webview/app/graph/surface';

vi.mock('../../../../src/webview/components/graph/view/component', () => ({
  default: ({ data }: { data: { nodes: Array<{ id: string }> } }) => (
    <div data-testid="graph-surface-graph">{data.nodes.map((node) => node.id).join(',')}</div>
  ),
}));

vi.mock('../../../../src/webview/components/depthViewControls', () => ({
  DepthViewControls: () => <div data-testid="depth-controls" />,
}));

describe('app/graph/surface', () => {
  it('renders the graph with colored data when nodes are present', () => {
    render(
      <GraphSurface
        graphData={{ nodes: [{ id: 'base-node', label: 'Base', color: '#111111' }], edges: [] }}
        coloredData={{ nodes: [{ id: 'colored-node', label: 'Colored', color: '#222222' }], edges: [] }}
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
    expect(screen.getByTestId('depth-controls')).toBeInTheDocument();
  });

  it('renders the empty hint when the graph has no nodes', () => {
    render(
      <GraphSurface
        graphData={{ nodes: [], edges: [] }}
        coloredData={null}
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
