import { render } from '@testing-library/react';
import ForceGraph2D from 'react-force-graph-2d';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Surface2d } from '../../../../../../src/webview/components/graph/rendering/surface/view/twoDimensional';

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
    onNodeDragEnd: vi.fn(),
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
});
