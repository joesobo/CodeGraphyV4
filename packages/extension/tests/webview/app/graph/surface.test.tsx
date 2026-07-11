import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraphSurface } from '../../../../src/webview/app/graph/surface';

const graphLifecycle = vi.hoisted(() => ({
  mounted: vi.fn(),
  projectionData: vi.fn(),
  renderedData: vi.fn(),
  unmounted: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/view/component', () => ({
  default: function MockGraph({
    data,
    projectionData,
    scopeVisibility,
  }: {
    data: { nodes: Array<{ id: string }> };
    projectionData?: { nodes: Array<{ id: string }> };
    scopeVisibility?: object;
  }) {
    graphLifecycle.renderedData(data);
    graphLifecycle.projectionData(projectionData);
    React.useEffect(() => {
      graphLifecycle.mounted();
      return () => { graphLifecycle.unmounted(); };
    }, []);
    return (
      <div
        data-testid="graph-surface-graph"
        data-scope-visibility={scopeVisibility ? 'present' : 'absent'}
      >
        {data.nodes.map((node) => node.id).join(',')}
      </div>
    );
  },
}));

vi.mock('../../../../src/webview/components/depthViewControls', () => ({
  DepthViewControls: () => <div data-testid="depth-controls" />,
}));

describe('app/graph/surface', () => {
  beforeEach(() => {
    graphLifecycle.mounted.mockReset();
    graphLifecycle.projectionData.mockReset();
    graphLifecycle.renderedData.mockReset();
    graphLifecycle.unmounted.mockReset();
  });

  it('renders the graph with colored data when nodes are present', () => {
    const graphData = {
      nodes: [{ id: 'base-node', label: 'Base', color: '#111111' }],
      edges: [],
    };
    const scopeVisibility = {
      edgeVisibility: { import: true },
      nodeVisibility: { file: true },
    };
    render(
      <GraphSurface
        graphData={graphData}
        coloredData={{ nodes: [{ id: 'colored-node', label: 'Colored', color: '#222222' }], edges: [] }}
        scopeProjectionRevision={3}
        scopeVisibility={scopeVisibility}
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
      .toHaveAttribute('data-scope-visibility', 'present');
    expect(screen.getByTestId('depth-controls')).toBeInTheDocument();
  });

  it('renders the empty hint when the graph has no nodes', () => {
    const graphData = { nodes: [], edges: [] };
    const scopeVisibility = {
      edgeVisibility: { import: true },
      nodeVisibility: { file: true },
    };
    render(
      <GraphSurface
        graphData={graphData}
        coloredData={null}
        scopeProjectionRevision={3}
        scopeVisibility={scopeVisibility}
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
    expect(screen.getByTestId('graph-surface-graph')).toBeInTheDocument();
    expect(screen.queryByTestId('depth-controls')).not.toBeInTheDocument();
  });

  it('renders the timeline-specific empty hint when the active commit has no graphable files', () => {
    render(
      <GraphSurface
        graphData={{ nodes: [], edges: [] }}
        coloredData={null}
        scopeProjectionRevision={0}
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

  it('keeps the graph renderer mounted while an empty projection hint is visible', () => {
    const graphData = {
      nodes: [{ id: 'raw-file.ts', label: 'raw-file.ts', color: '#111111' }],
      edges: [],
    };
    const nonEmptyProjection = {
      nodes: [{ id: 'file.ts', label: 'file.ts', color: '#111111' }],
      edges: [],
    };
    const emptyProjection = { nodes: [], edges: [] };
    const props = {
      depthMode: false,
      edgeDecorations: {},
      nodeDecorations: {},
      onAddFilterRequested: () => {},
      onAddLegendRequested: () => {},
      pluginHost: undefined,
      scopeProjectionRevision: 1,
      showOrphans: false,
      theme: 'light' as const,
      timelineActive: false,
    };
    const { rerender } = render(
      <GraphSurface {...props} graphData={graphData} coloredData={nonEmptyProjection} />,
    );

    rerender(
      <GraphSurface
        {...props}
        graphData={graphData}
        coloredData={emptyProjection}
        scopeProjectionRevision={2}
      />,
    );
    expect(screen.getByText(/All files are hidden/)).toBeInTheDocument();
    expect(screen.getByTestId('graph-surface-graph')).toBeInTheDocument();
    expect(screen.getByText(/All files are hidden/).parentElement?.parentElement)
      .toHaveClass('bg-background');
    expect(screen.queryByTestId('depth-controls')).not.toBeInTheDocument();
    expect(graphLifecycle.renderedData).toHaveBeenLastCalledWith(nonEmptyProjection);
    expect(graphLifecycle.projectionData).toHaveBeenLastCalledWith(emptyProjection);

    rerender(
      <GraphSurface
        {...props}
        graphData={graphData}
        coloredData={nonEmptyProjection}
        scopeProjectionRevision={3}
      />,
    );
    expect(graphLifecycle.mounted).toHaveBeenCalledOnce();
    expect(graphLifecycle.unmounted).not.toHaveBeenCalled();
    expect(graphLifecycle.renderedData).toHaveBeenLastCalledWith(nonEmptyProjection);
    expect(graphLifecycle.projectionData).toHaveBeenLastCalledWith(nonEmptyProjection);
    expect(screen.queryByText(/All files are hidden/)).not.toBeInTheDocument();
  });
});
