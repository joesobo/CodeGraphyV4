import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import Graph from '../../../src/webview/components/graph/view/component';
import { toOwnedPhysicsConfig } from '../../../src/webview/components/graph/rendering/surface/owned2d/layout';
import { DEFAULT_DIRECTION_COLOR } from '../../../src/shared/fileColors';
import type { IGraphData } from '../../../src/shared/graph/contracts';
import { graphStore } from '../../../src/webview/store/state';
import ForceGraph2D from '../../__mocks__/ownedGraphSurface';
import { getSentMessages } from '../../helpers/sentMessages';

const mockData: IGraphData = {
  nodes: [
    { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
    { id: 'b.ts', label: 'b.ts', color: '#67E8F9' },
  ],
  edges: [{ id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] }],
};

const bidirectionalData: IGraphData = {
  nodes: [
    { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
    { id: 'b.ts', label: 'b.ts', color: '#67E8F9' },
  ],
  edges: [
    { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] },
    { id: 'b.ts->a.ts', from: 'b.ts', to: 'a.ts' , kind: 'import', sources: [] },
  ],
};

/** Reset store to defaults, with optional overrides */
function setStore(overrides: Record<string, unknown> = {}) {
  graphStore.setState({
    favorites: new Set<string>(),
    bidirectionalMode: 'separate',
    physicsSettings: { repelForce: 10, linkDistance: 80, linkForce: 0.15, damping: 0.7, centerForce: 0.1 },
    nodeSizeMode: 'connections',
    directionMode: 'arrows',
    directionColor: DEFAULT_DIRECTION_COLOR,
    particleSpeed: 0.005,
    particleSize: 4,
    showLabels: true,
    ...overrides,
  });
}

describe('Graph: owned WebGPU rendering', () => {
  const mockMethods = ForceGraph2D.getMockMethods();

  beforeEach(() => {
    ForceGraph2D.clearAllHandlers();
    vi.clearAllMocks();
    setStore();
  });

  it('renders the owned WebGPU renderer', () => {
    const { getByTestId } = render(<Graph data={mockData} />);
    expect(getByTestId('owned-webgpu-graph')).toBeInTheDocument();
  });

  it('passes graphData with correct node and link counts to the owned graph surface', () => {
    render(<Graph data={mockData} />);
    const props = ForceGraph2D.getLastProps();
    expect(props.graphData).toBeDefined();
    expect(props.graphData.nodes).toHaveLength(2);
    expect(props.graphData.links).toHaveLength(1);
  });

  it('disables directional rendering when directionMode=none', () => {
    setStore({ directionMode: 'none' });
    render(<Graph data={mockData} />);
    expect(ForceGraph2D.getLastProps().directionMode).toBe('none');
  });

  it('enables WebGPU arrows when directionMode=arrows', () => {
    setStore({ directionMode: 'arrows' });
    render(<Graph data={mockData} />);
    const props = ForceGraph2D.getLastProps();
    expect(props.directionMode).toBe('arrows');
    expect(props.graphData.nodes[0]?.size).toBeGreaterThan(0);
  });

  it('declaratively syncs directional settings when mode changes', () => {
    render(<Graph data={mockData} />);
    act(() => graphStore.setState({ directionMode: 'particles' }));
    expect(ForceGraph2D.getLastProps().directionMode).toBe('particles');
    expect(ForceGraph2D.getLastProps().particleSpeed).toBe(0.005);
    act(() => graphStore.setState({ directionMode: 'arrows' }));
    expect(ForceGraph2D.getLastProps().directionMode).toBe('arrows');
  });

  it('marks combined links as bidirectional for the WebGPU arrow pipeline', () => {
    setStore({ bidirectionalMode: 'combined', directionMode: 'arrows' });
    render(<Graph data={bidirectionalData} />);
    expect(ForceGraph2D.getLastProps().graphData.links.some(link => link.bidirectional)).toBe(true);
  });

  it('keeps ordinary links non-bidirectional', () => {
    render(<Graph data={mockData} />);
    expect(ForceGraph2D.getLastProps().graphData.links[0]?.bidirectional).toBe(false);
  });

  it('preserves bidirectional metadata when direction mode changes', () => {
    setStore({ bidirectionalMode: 'combined', directionMode: 'arrows' });
    render(<Graph data={bidirectionalData} />);
    act(() => graphStore.setState({ directionMode: 'particles' }));
    expect(ForceGraph2D.getLastProps().graphData.links.some(link => link.bidirectional)).toBe(true);
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
    expect(props.physicsSettings?.damping).toBe(0.7);
  });

  it('maps center pull into the owned per-node gravity force', () => {
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
    const settings = ForceGraph2D.getLastProps().physicsSettings;
    expect(settings).toBeDefined();
    expect(toOwnedPhysicsConfig(settings!).centralGravity).toBe(1);
  });

  it('sends PHYSICS_STABILIZED when onEngineStop fires', () => {
    render(<Graph data={mockData} />);
    const before = getSentMessages().length;

    act(() => {
      ForceGraph2D.simulateEngineStop();
    });

    const messages = getSentMessages();
    expect(messages.length).toBeGreaterThan(before);
    const stabilized = messages.find(msg => msg.type === 'PHYSICS_STABILIZED');
    expect(stabilized).toBeTruthy();
  });

  it('sends NODE_SELECTED when a node is clicked', () => {
    render(<Graph data={mockData} />);
    const before = getSentMessages().length;

    act(() => {
      ForceGraph2D.simulateNodeClick({ id: 'a.ts' });
    });

    const allMessages = getSentMessages();
    expect(allMessages.length).toBeGreaterThan(before);
    const selected = allMessages.find(msg => msg.type === 'NODE_SELECTED');
    expect(selected).toBeTruthy();
  });

  it('provides zoomToFit method on the ref', () => {
    render(<Graph data={mockData} />);
    expect(mockMethods.zoomToFit).toBeDefined();
  });
});
