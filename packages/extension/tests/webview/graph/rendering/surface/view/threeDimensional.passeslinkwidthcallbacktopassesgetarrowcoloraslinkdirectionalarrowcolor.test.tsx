import { render } from '@testing-library/react';
import ForceGraph3D from 'react-force-graph-3d';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Surface3d
} from '../../../../../../src/webview/components/graph/rendering/surface/view/threeDimensional';

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

function createNodeThreeObjectContext() {
  return {
    graphAppearanceRef: { current: { labelForeground: '#f8fafc' } },
    meshesRef: { current: new Map() },
    showLabelsRef: { current: true },
    spritesRef: { current: new Map() },
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
    nodeThreeObjectContext: createNodeThreeObjectContext(),
    particleSize: 4,
    particleSpeed: 0.005,
    sharedProps: createSharedProps(),
  };
}

describe('Surface3d', () => {

    beforeEach(() => {
      (ForceGraph3D as unknown as { clearAllHandlers: () => void }).clearAllHandlers();
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
});
