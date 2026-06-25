import { render, screen } from '@testing-library/react';
import ForceGraph3D from 'react-force-graph-3d';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Surface3d,
  getSurface3dMeasurementKey
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



    it('renders the force graph 3d element', () => {
      render(<Surface3d {...createDefaultProps()} />);
      expect(screen.getByTestId('force-graph-3d')).toBeInTheDocument();
    });



    it('changes the surface measurement key after dimensions recover', () => {
      expect(getSurface3dMeasurementKey({ height: undefined, width: undefined })).toBe('unmeasured');
      expect(getSurface3dMeasurementKey({ height: 320, width: 480 })).toBe('measured');
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
});
