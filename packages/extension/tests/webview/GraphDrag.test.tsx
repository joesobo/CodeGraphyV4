import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import Graph from '../../src/webview/components/Graph';
import { IGraphData } from '../../src/shared/types';
import { graphStore } from '../../src/webview/store';
import ForceGraph2D, { mockMethods } from 'react-force-graph-2d';

const mockData: IGraphData = {
  nodes: [
    { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
    { id: 'b.ts', label: 'b.ts', color: '#67E8F9' },
  ],
  edges: [{ id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' }],
};

/** Reset store to defaults, with optional overrides */
function setStore(overrides: Record<string, unknown> = {}) {
  graphStore.setState({
    favorites: new Set<string>(),
    bidirectionalMode: 'separate',
    physicsSettings: { repelForce: 10, linkDistance: 80, linkForce: 0.15, damping: 0.7, centerForce: 0.1 },
    nodeSizeMode: 'connections',
    directionMode: 'arrows',
    particleSpeed: 0.005,
    particleSize: 4,
    showLabels: true,
    graphMode: '2d',
    ...overrides,
  });
}

describe('Graph: force-graph rendering', () => {
  beforeEach(() => {
    ForceGraph2D.clearAllHandlers();
    vi.clearAllMocks();
    setStore();
  });

  it('renders ForceGraph2D in 2D mode (default)', () => {
    const { getByTestId } = render(<Graph data={mockData} />);
    expect(getByTestId('force-graph-2d')).toBeInTheDocument();
  });

  it('passes graphData with correct node and link counts to ForceGraph2D', () => {
    render(<Graph data={mockData} />);
    const props = ForceGraph2D.getLastProps();
    expect(props.graphData).toBeDefined();
    expect(props.graphData.nodes).toHaveLength(2);
    expect(props.graphData.links).toHaveLength(1);
  });

  it('disables arrow when directionMode=none', () => {
    setStore({ directionMode: 'none' });
    render(<Graph data={mockData} />);
    const props = ForceGraph2D.getLastProps();
    expect(props.linkDirectionalArrowLength).toBe(0);
  });

  it('enables arrow when directionMode=arrows (default)', () => {
    setStore({ directionMode: 'arrows' });
    render(<Graph data={mockData} />);
    const props = ForceGraph2D.getLastProps();
    expect(props.linkDirectionalArrowLength).toBeGreaterThan(0);
  });

  it('forces a 2D redraw when direction mode changes', () => {
    render(<Graph data={mockData} />);
    mockMethods.refresh.mockClear();

    act(() => {
      graphStore.setState({ directionMode: 'particles' });
    });

    expect(mockMethods.refresh).toHaveBeenCalledTimes(1);
  });

  it('passes d3VelocityDecay from physicsSettings.damping', () => {
    setStore({
      physicsSettings: {
        repelForce: 12,
        linkDistance: 120,
        linkForce: 0.1,
        damping: 0.7,
        centerForce: 0.05,
      },
    });
    render(<Graph data={mockData} />);
    const props = ForceGraph2D.getLastProps();
    expect(props.d3VelocityDecay).toBe(0.7);
  });

  it('uses per-node center pull forces (forceX/forceY) instead of centroid forceCenter', () => {
    setStore({
      physicsSettings: {
        repelForce: 10,
        linkDistance: 80,
        linkForce: 0.15,
        damping: 0.7,
        centerForce: 1,
      },
    });
    render(<Graph data={mockData} />);

    expect(mockMethods.d3Force).toHaveBeenCalledWith('forceX');
    expect(mockMethods.d3Force).toHaveBeenCalledWith('forceY');
    expect(mockMethods.d3Force).not.toHaveBeenCalledWith('center');
  });

  it('sends PHYSICS_STABILIZED when onEngineStop fires', () => {
    render(<Graph data={mockData} />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessages: unknown[] = (globalThis as any).__vscodeSentMessages;
    const before = sentMessages.length;

    act(() => {
      ForceGraph2D.simulateEngineStop();
    });

    const after = sentMessages.length;
    expect(after).toBeGreaterThan(before);
    const stabilized = sentMessages.find((m: { type: string }) => m.type === 'PHYSICS_STABILIZED');
    expect(stabilized).toBeTruthy();
  });

  it('sends NODE_SELECTED when a node is clicked', () => {
    render(<Graph data={mockData} />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessages: unknown[] = (globalThis as any).__vscodeSentMessages;
    const before = sentMessages.length;

    act(() => {
      ForceGraph2D.simulateNodeClick({ id: 'a.ts' });
    });

    const after = sentMessages.length;
    expect(after).toBeGreaterThan(before);
    const selected = sentMessages.find((m: { type: string }) => m.type === 'NODE_SELECTED');
    expect(selected).toBeTruthy();
  });

  it('provides zoomToFit method on the ref', () => {
    render(<Graph data={mockData} />);
    expect(mockMethods.zoomToFit).toBeDefined();
  });
});

describe('Graph: 3D mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStore({ graphMode: '3d' });
  });

  it('renders ForceGraph3D when graphMode is 3d', () => {
    const { getByTestId } = render(<Graph data={mockData} />);
    expect(getByTestId('force-graph-3d')).toBeInTheDocument();
  });
});
