import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import ForceGraph3D from 'react-force-graph-3d';
import {
  DeferredSurface3d,
  Surface3d,
  useDeferredSurface3dMount,
} from '../../../../../src/webview/components/graph/rendering/surface/view3d';

function createSharedProps() {
  return {
    cooldownTicks: 20,
    d3AlphaDecay: 0.0228,
    d3VelocityDecay: 0.7,
    dagLevelDistance: undefined,
    dagMode: undefined,
    graphData: { nodes: [], links: [] },
    height: 400,
    nodeId: 'id' as const,
    onBackgroundClick: vi.fn(),
    onBackgroundRightClick: vi.fn(),
    onEngineStop: vi.fn(),
    onLinkClick: vi.fn(),
    onLinkRightClick: vi.fn(),
    onNodeClick: vi.fn(),
    onNodeHover: vi.fn(),
    onNodeRightClick: vi.fn(),
    warmupTicks: 0,
    width: 600,
  };
}

function createDefaultProps() {
  return {
    backgroundColor: '#1e1e1e',
    directionMode: 'arrows' as 'arrows' | 'particles' | 'none',
    fg3dRef: { current: undefined },
    getArrowColor: vi.fn(() => '#ffffff'),
    getLinkColor: vi.fn(() => '#888888'),
    getLinkParticles: vi.fn(() => 2),
    getLinkWidth: vi.fn(() => 1),
    getParticleColor: vi.fn(() => '#ff0000'),
    nodeThreeObject: vi.fn(),
    particleSize: 4,
    particleSpeed: 0.005,
    sharedProps: createSharedProps(),
  };
}

describe('Surface3d', () => {
  beforeEach(() => {
    (ForceGraph3D as unknown as { clearAllHandlers: () => void }).clearAllHandlers();
  });

  it('renders the force graph 3d element', () => {
    render(<Surface3d {...createDefaultProps()} />);
    expect(screen.getByTestId('force-graph-3d')).toBeInTheDocument();
  });

  it('passes backgroundColor to ForceGraph3D', () => {
    render(<Surface3d {...createDefaultProps()} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.backgroundColor).toBe('#1e1e1e');
  });

  it('sets linkDirectionalArrowLength to 6 when direction mode is arrows', () => {
    render(<Surface3d {...createDefaultProps()} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalArrowLength).toBe(6);
  });

  it('sets linkDirectionalArrowLength to 0 when direction mode is not arrows', () => {
    const defaultProps = createDefaultProps();
    defaultProps.directionMode = 'particles';
    render(<Surface3d {...defaultProps} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalArrowLength).toBe(0);
  });

  it('sets linkDirectionalArrowRelPos to 1', () => {
    render(<Surface3d {...createDefaultProps()} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalArrowRelPos).toBe(1);
  });

  it('sets linkDirectionalParticles to getLinkParticles when direction mode is particles', () => {
    const defaultProps = createDefaultProps();
    defaultProps.directionMode = 'particles';
    render(<Surface3d {...defaultProps} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalParticles).toBe(defaultProps.getLinkParticles);
  });

  it('sets linkDirectionalParticles to 0 when direction mode is arrows', () => {
    render(<Surface3d {...createDefaultProps()} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalParticles).toBe(0);
  });

  it('passes particleSize as linkDirectionalParticleWidth', () => {
    render(<Surface3d {...createDefaultProps()} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalParticleWidth).toBe(4);
  });

  it('passes particleSpeed as linkDirectionalParticleSpeed', () => {
    render(<Surface3d {...createDefaultProps()} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalParticleSpeed).toBe(0.005);
  });

  it('sets nodeLabel to empty string', () => {
    render(<Surface3d {...createDefaultProps()} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.nodeLabel).toBe('');
  });

  it('sets nodeThreeObjectExtend to false', () => {
    render(<Surface3d {...createDefaultProps()} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.nodeThreeObjectExtend).toBe(false);
  });

  it('passes nodeThreeObject callback', () => {
    const defaultProps = createDefaultProps();
    render(<Surface3d {...defaultProps} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.nodeThreeObject).toBe(defaultProps.nodeThreeObject);
  });

  it('passes linkColor callback', () => {
    const defaultProps = createDefaultProps();
    render(<Surface3d {...defaultProps} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkColor).toBe(defaultProps.getLinkColor);
  });

  it('passes linkWidth callback', () => {
    const defaultProps = createDefaultProps();
    render(<Surface3d {...defaultProps} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkWidth).toBe(defaultProps.getLinkWidth);
  });

  it('computes nodeVal from node size divided by DEFAULT_NODE_SIZE', () => {
    render(<Surface3d {...createDefaultProps()} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    const nodeVal = props.nodeVal as (node: { size?: number }) => number;
    // DEFAULT_NODE_SIZE is 16, so size 32 / 16 = 2
    expect(nodeVal({ size: 32 })).toBe(2);
    expect(nodeVal({ size: 16 })).toBe(1);
  });

  it('linkCurvature returns curvature from link or 0 as default', () => {
    render(<Surface3d {...createDefaultProps()} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    const linkCurvature = props.linkCurvature as (link: { curvature?: number }) => number;
    expect(linkCurvature({ curvature: 0.3 })).toBe(0.3);
    expect(linkCurvature({})).toBe(0);
  });

  it('sets linkCurveRotation to rotation', () => {
    render(<Surface3d {...createDefaultProps()} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkCurveRotation).toBe('rotation');
  });

  it('sets linkDirectionalArrowLength to 0 when direction mode is none', () => {
    const defaultProps = createDefaultProps();
    defaultProps.directionMode = 'none';
    render(<Surface3d {...defaultProps} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalArrowLength).toBe(0);
  });

  it('sets linkDirectionalParticles to 0 when direction mode is none', () => {
    const defaultProps = createDefaultProps();
    defaultProps.directionMode = 'none';
    render(<Surface3d {...defaultProps} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalParticles).toBe(0);
  });

  it('passes getArrowColor as linkDirectionalArrowColor', () => {
    const defaultProps = createDefaultProps();
    render(<Surface3d {...defaultProps} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalArrowColor).toBe(defaultProps.getArrowColor);
  });

  it('passes getParticleColor as linkDirectionalParticleColor', () => {
    const defaultProps = createDefaultProps();
    render(<Surface3d {...defaultProps} />);
    const props = (ForceGraph3D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalParticleColor).toBe(defaultProps.getParticleColor);
  });

  it('renders the fallback until the deferred 3d mount has settled', async () => {
    const frames: FrameRequestCallback[] = [];

    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    render(
      <DeferredSurface3d
        {...createDefaultProps()}
        fallback={<div data-testid="surface-3d-fallback" />}
      />,
    );

    expect(screen.getByTestId('surface-3d-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('force-graph-3d')).not.toBeInTheDocument();

    await act(async () => {
      frames.shift()?.(0);
    });
    expect(screen.getByTestId('surface-3d-fallback')).toBeInTheDocument();

    await act(async () => {
      frames.shift()?.(0);
    });
    expect(screen.getByTestId('force-graph-3d')).toBeInTheDocument();
  });

  it('mounts immediately when deferred mounting is disabled', () => {
    const requestAnimationFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);

    const { result } = renderHook(() => useDeferredSurface3dMount(false));

    expect(result.current).toBe(true);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('cancels both scheduled animation frames when unmounted during deferred mount', async () => {
    const frames: FrameRequestCallback[] = [];
    const cancelAnimationFrame = vi.fn();
    let nextFrameId = 1;

    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      const id = nextFrameId;
      nextFrameId += 1;
      return id;
    }));
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);

    const { unmount } = renderHook(() => useDeferredSurface3dMount(true));

    await act(async () => {
      frames.shift()?.(0);
    });

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(2);
  });
});
