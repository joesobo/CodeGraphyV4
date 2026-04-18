import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, screen, waitFor } from '@testing-library/react';
import Graph from '../../../src/webview/components/graph/view';
import { DEFAULT_DIRECTION_COLOR } from '../../../src/shared/fileColors';
import type { IGraphData } from '../../../src/shared/graph/contracts';
import { graphStore } from '../../../src/webview/store/state';
import ForceGraph2D from 'react-force-graph-2d';
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
    graphMode: '2d',
    ...overrides,
  });
}

describe('Graph: force-graph rendering', () => {
  const mockMethods = ForceGraph2D.getMockMethods();

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
    expect(props.linkDirectionalArrowRelPos).toEqual(expect.any(Function));

    const relPos = props.linkDirectionalArrowRelPos({
      source: { id: 'a.ts', x: 0, y: 0, size: 10 },
      target: { id: 'b.ts', x: 100, y: 0, size: 10 },
    });
    expect(relPos).toBe(1);
    expect(props.nodeRelSize).toBe(1);
    expect(props.nodeVal({ size: 10 })).toBe(100);
  });

  it('imperatively syncs 2D directional settings when mode changes', () => {
    render(<Graph data={mockData} />);
    mockMethods.linkDirectionalArrowLength.mockClear();
    mockMethods.linkDirectionalArrowRelPos.mockClear();
    mockMethods.linkDirectionalParticles.mockClear();
    mockMethods.linkDirectionalParticleSpeed.mockClear();
    mockMethods.d3ReheatSimulation.mockClear();

    act(() => {
      graphStore.setState({ directionMode: 'particles' });
    });

    expect(mockMethods.linkDirectionalArrowLength).toHaveBeenLastCalledWith(0);
    expect(mockMethods.linkDirectionalArrowRelPos).toHaveBeenLastCalledWith(expect.any(Function));
    expect(mockMethods.linkDirectionalParticles).toHaveBeenLastCalledWith(expect.any(Function));
    expect(mockMethods.linkDirectionalParticleSpeed).toHaveBeenLastCalledWith(0.005);
    expect(mockMethods.d3ReheatSimulation).toHaveBeenCalledTimes(1);

    act(() => {
      graphStore.setState({ directionMode: 'arrows' });
    });

    expect(mockMethods.linkDirectionalArrowLength).toHaveBeenLastCalledWith(12);
    expect(mockMethods.linkDirectionalParticles).toHaveBeenLastCalledWith(0);
  });

  it('draws bidirectional arrows when coordinates include 0', () => {
    setStore({ bidirectionalMode: 'combined', directionMode: 'arrows' });
    render(<Graph data={bidirectionalData} />);

    const props = ForceGraph2D.getLastProps();
    const drawLink = props.linkCanvasObject as (
      link: unknown,
      ctx: CanvasRenderingContext2D,
      globalScale: number
    ) => void;
    const link = props.graphData.links.find((link: { bidirectional?: boolean }) => link.bidirectional);
    expect(link).toBeTruthy();

    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      globalAlpha: 1,
      lineWidth: 1,
      strokeStyle: '#000',
    } as unknown as CanvasRenderingContext2D;

    drawLink(
      {
        ...link,
        source: { id: 'a.ts', x: 0, y: 10, size: 10 },
        target: { id: 'b.ts', x: 80, y: 10, size: 10 },
      },
      ctx,
      1
    );

    expect(ctx.lineTo).toHaveBeenCalled();
  });

  it('keeps default link renderer for non-bidirectional links', () => {
    setStore({ directionMode: 'particles' });
    render(<Graph data={mockData} />);

    const props = ForceGraph2D.getLastProps();
    const link = props.graphData.links[0];
    expect(link.bidirectional).not.toBe(true);
    expect(props.linkCanvasObjectMode(link)).toBe('after');
  });

  it('replaces link renderer only for bidirectional arrows mode', () => {
    setStore({ bidirectionalMode: 'combined', directionMode: 'arrows' });
    render(<Graph data={bidirectionalData} />);

    let props = ForceGraph2D.getLastProps();
    let link = props.graphData.links.find((link: { bidirectional?: boolean }) => link.bidirectional);
    expect(link).toBeTruthy();
    expect(props.linkCanvasObjectMode(link)).toBe('replace');

    act(() => {
      graphStore.setState({ directionMode: 'particles' });
    });

    props = ForceGraph2D.getLastProps();
    link = props.graphData.links.find((link: { bidirectional?: boolean }) => link.bidirectional);
    expect(link).toBeTruthy();
    expect(props.linkCanvasObjectMode(link)).toBe('after');
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

    expect(mockMethods.d3Force).toHaveBeenCalledWith('forceX', expect.anything());
    expect(mockMethods.d3Force).toHaveBeenCalledWith('forceY', expect.anything());
    expect(mockMethods.d3Force).not.toHaveBeenCalledWith('center', expect.anything());
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

describe('Graph: 3D mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStore({ graphMode: '3d' });
  });

  it('renders ForceGraph3D when graphMode is 3d', async () => {
    render(<Graph data={mockData} />);

    await waitFor(() => {
      expect(screen.getByTestId('force-graph-3d')).toBeInTheDocument();
    });
  });
});
