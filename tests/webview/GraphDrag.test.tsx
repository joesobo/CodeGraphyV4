import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import Graph from '../../src/webview/components/Graph';
import { IGraphData } from '../../src/shared/types';
import ForceGraph2D, { mockMethods } from 'react-force-graph-2d';

const mockData: IGraphData = {
  nodes: [
    { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
    { id: 'b.ts', label: 'b.ts', color: '#67E8F9' },
  ],
  edges: [{ id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' }],
};

describe('Graph: force-graph rendering', () => {
  beforeEach(() => {
    ForceGraph2D.clearAllHandlers();
    vi.clearAllMocks();
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

  it('disables arrow when showArrows=false', () => {
    render(<Graph data={mockData} showArrows={false} />);
    const props = ForceGraph2D.getLastProps();
    expect(props.linkDirectionalArrowLength).toBe(0);
  });

  it('enables arrow when showArrows=true (default)', () => {
    render(<Graph data={mockData} showArrows={true} />);
    const props = ForceGraph2D.getLastProps();
    expect(props.linkDirectionalArrowLength).toBeGreaterThan(0);
  });

  it('passes d3VelocityDecay from physicsSettings.damping', () => {
    render(<Graph data={mockData} physicsSettings={{
      repelForce: 12,
      linkDistance: 120,
      linkForce: 0.1,
      damping: 0.7,
      centerForce: 0.05,
    }} />);
    const props = ForceGraph2D.getLastProps();
    expect(props.d3VelocityDecay).toBe(0.7);
  });

  it('uses per-node center pull forces (forceX/forceY) instead of centroid forceCenter', () => {
    render(<Graph data={mockData} physicsSettings={{
      repelForce: 10,
      linkDistance: 80,
      linkForce: 0.15,
      damping: 0.7,
      centerForce: 1,
    }} />);

    expect(mockMethods.d3Force).toHaveBeenCalledWith('forceX');
    expect(mockMethods.d3Force).toHaveBeenCalledWith('forceY');
    expect(mockMethods.d3Force).not.toHaveBeenCalledWith('center');
  });

  it('sends PHYSICS_STABILIZED when onEngineStop fires', () => {
    render(<Graph data={mockData} />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessages: unknown[] = (globalThis as any).__vscodeSentMessages;
    const before = sentMessages.length;

    ForceGraph2D.simulateEngineStop();

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

    ForceGraph2D.simulateNodeClick({ id: 'a.ts' });

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
  });

  it('renders ForceGraph3D when graphMode is 3d', () => {
    const { getByTestId } = render(<Graph data={mockData} graphMode="3d" />);
    expect(getByTestId('force-graph-3d')).toBeInTheDocument();
  });
});
