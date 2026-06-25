import { act, render, renderHook, screen } from '@testing-library/react';
import ForceGraph3D from 'react-force-graph-3d';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DeferredSurface3d,
  Surface3d,
  useDeferredSurface3dMount
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
