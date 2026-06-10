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



    it('auto-pauses redraw by default', () => {
      render(<Surface2d {...createDefaultProps()} />);
      const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
      expect(props.autoPauseRedraw).toBe(true);
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
});
