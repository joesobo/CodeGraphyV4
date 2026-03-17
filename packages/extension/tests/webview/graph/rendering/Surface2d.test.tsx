import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ForceGraph2D from 'react-force-graph-2d';
import { Surface2d } from '../../../../src/webview/components/graph/rendering/Surface2d';

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
    directionMode: 'arrows' as const,
    fg2dRef: { current: undefined },
    getArrowColor: vi.fn(() => '#ffffff'),
    getArrowRelPos: vi.fn(() => 1),
    getLinkColor: vi.fn(() => '#888888'),
    getLinkParticles: vi.fn(() => 2),
    getLinkWidth: vi.fn(() => 1),
    getParticleColor: vi.fn(() => '#ff0000'),
    linkCanvasObject: vi.fn(),
    nodeCanvasObject: vi.fn(),
    nodePointerAreaPaint: vi.fn(),
    onRenderFramePost: vi.fn(),
    particleSize: 4,
    particleSpeed: 0.005,
    sharedProps: createSharedProps(),
  };
}

describe('Surface2d', () => {
  beforeEach(() => {
    (ForceGraph2D as unknown as { clearAllHandlers: () => void }).clearAllHandlers();
  });

  it('renders the force graph 2d canvas', () => {
    render(<Surface2d {...createDefaultProps()} />);
    expect(screen.getByTestId('force-graph-2d')).toBeInTheDocument();
  });

  it('passes backgroundColor to ForceGraph2D', () => {
    render(<Surface2d {...createDefaultProps()} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.backgroundColor).toBe('#1e1e1e');
  });

  it('sets linkDirectionalArrowLength to DIRECTIONAL_ARROW_LENGTH_2D when direction mode is arrows', () => {
    render(<Surface2d {...createDefaultProps()} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalArrowLength).toBe(12);
  });

  it('sets linkDirectionalArrowLength to 0 when direction mode is not arrows', () => {
    const defaultProps = createDefaultProps();
    defaultProps.directionMode = 'particles';
    render(<Surface2d {...defaultProps} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalArrowLength).toBe(0);
  });

  it('sets linkDirectionalParticles to getLinkParticles when direction mode is particles', () => {
    const defaultProps = createDefaultProps();
    defaultProps.directionMode = 'particles';
    render(<Surface2d {...defaultProps} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalParticles).toBe(defaultProps.getLinkParticles);
  });

  it('sets linkDirectionalParticles to 0 when direction mode is arrows', () => {
    render(<Surface2d {...createDefaultProps()} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalParticles).toBe(0);
  });

  it('passes particleSize as linkDirectionalParticleWidth', () => {
    render(<Surface2d {...createDefaultProps()} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalParticleWidth).toBe(4);
  });

  it('passes particleSpeed as linkDirectionalParticleSpeed', () => {
    render(<Surface2d {...createDefaultProps()} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalParticleSpeed).toBe(0.005);
  });

  it('sets nodeRelSize to 1', () => {
    render(<Surface2d {...createDefaultProps()} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.nodeRelSize).toBe(1);
  });

  it('sets autoPauseRedraw to false', () => {
    render(<Surface2d {...createDefaultProps()} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.autoPauseRedraw).toBe(false);
  });

  it('passes nodeCanvasObject callback', () => {
    const defaultProps = createDefaultProps();
    render(<Surface2d {...defaultProps} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.nodeCanvasObject).toBe(defaultProps.nodeCanvasObject);
  });

  it('nodeCanvasObjectMode returns replace', () => {
    render(<Surface2d {...createDefaultProps()} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    const mode = (props.nodeCanvasObjectMode as () => string)();
    expect(mode).toBe('replace');
  });

  it('passes linkColor callback', () => {
    const defaultProps = createDefaultProps();
    render(<Surface2d {...defaultProps} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkColor).toBe(defaultProps.getLinkColor);
  });

  it('passes linkWidth callback', () => {
    const defaultProps = createDefaultProps();
    render(<Surface2d {...defaultProps} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkWidth).toBe(defaultProps.getLinkWidth);
  });

  it('computes nodeVal from node size using squared value', () => {
    render(<Surface2d {...createDefaultProps()} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    const nodeVal = props.nodeVal as (node: { size?: number }) => number;
    expect(nodeVal({ size: 10 })).toBe(100);
    expect(nodeVal({ size: 1 })).toBe(1);
  });

  it('computes nodeVal with default size when node size is undefined', () => {
    render(<Surface2d {...createDefaultProps()} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    const nodeVal = props.nodeVal as (node: { size?: number }) => number;
    // default fallback is 16, 16*16 = 256
    expect(nodeVal({})).toBe(256);
  });

  it('computes nodeVal minimum of 1', () => {
    render(<Surface2d {...createDefaultProps()} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    const nodeVal = props.nodeVal as (node: { size?: number }) => number;
    // size 0 -> 0*0=0, Math.max(1,0) = 1
    expect(nodeVal({ size: 0 })).toBe(1);
  });

  it('linkCurvature returns curvature from link or 0 as default', () => {
    render(<Surface2d {...createDefaultProps()} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    const linkCurvature = props.linkCurvature as (link: { curvature?: number }) => number;
    expect(linkCurvature({ curvature: 0.5 })).toBe(0.5);
    expect(linkCurvature({})).toBe(0);
  });

  it('passes onRenderFramePost callback', () => {
    const defaultProps = createDefaultProps();
    render(<Surface2d {...defaultProps} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.onRenderFramePost).toBe(defaultProps.onRenderFramePost);
  });

  it('passes nodePointerAreaPaint callback', () => {
    const defaultProps = createDefaultProps();
    render(<Surface2d {...defaultProps} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.nodePointerAreaPaint).toBe(defaultProps.nodePointerAreaPaint);
  });

  it('sets linkDirectionalArrowLength to 0 when direction mode is none', () => {
    const defaultProps = createDefaultProps();
    defaultProps.directionMode = 'none';
    render(<Surface2d {...defaultProps} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalArrowLength).toBe(0);
  });

  it('sets linkDirectionalParticles to 0 when direction mode is none', () => {
    const defaultProps = createDefaultProps();
    defaultProps.directionMode = 'none';
    render(<Surface2d {...defaultProps} />);
    const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
    expect(props.linkDirectionalParticles).toBe(0);
  });
});
