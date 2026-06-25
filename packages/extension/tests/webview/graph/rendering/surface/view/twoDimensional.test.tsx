import { render, screen } from '@testing-library/react';
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

    it('passes constant arrow position and color values', () => {
      const defaultProps = createDefaultProps();
      render(<Surface2d {...defaultProps} />);
      const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();

      expect(props.linkDirectionalArrowRelPos).toBe(1);
      expect(props.linkDirectionalArrowColor).toBe('#ffffff');
      expect(defaultProps.getArrowRelPos).toHaveBeenCalledOnce();
      expect(defaultProps.getArrowColor).toHaveBeenCalledOnce();
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



    it('auto-pauses redraw outside animated particle mode', () => {
      render(<Surface2d {...createDefaultProps()} />);
      const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
      expect(props.autoPauseRedraw).toBe(true);
    });



    it('keeps redraw active for animated particles', () => {
      const defaultProps = createDefaultProps();
      defaultProps.directionMode = 'particles';
      render(<Surface2d {...defaultProps} />);
      const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
      expect(props.autoPauseRedraw).toBe(false);
    });



    it('passes particleSize as linkDirectionalParticleWidth', () => {
      render(<Surface2d {...createDefaultProps()} />);
      const props = (ForceGraph2D as unknown as { getLastProps: () => Record<string, unknown> }).getLastProps();
      expect(props.linkDirectionalParticleWidth).toBe(4);
    });
});
