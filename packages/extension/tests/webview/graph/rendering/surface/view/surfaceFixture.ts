import { vi } from 'vitest';
import type { Surface2dProps } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/contracts';

export function createDefaultSurfaceProps(): Surface2dProps {
  return {
    backgroundColor: '#1e1e1e',
    directionMode: 'arrows',
    fg2dRef: { current: undefined },
    getArrowColor: vi.fn(() => '#ffffff'),
    getLinkColor: vi.fn(() => '#888888'),
    getLinkOpacity: vi.fn(() => 0.3),
    getLinkParticles: vi.fn(() => 2),
    getLinkWidth: vi.fn(() => 1),
    getParticleColor: vi.fn(() => '#ff0000'),
    nodeLabelCanvasObject: vi.fn(),
    onRenderFramePost: vi.fn(),
    particleSize: 4,
    particleSpeed: 0.005,
    showFps: false,
    sharedProps: {
      cooldownTicks: 20,
      d3AlphaDecay: 0.0228,
      d3VelocityDecay: 0.7,
      dagLevelDistance: undefined,
      dagMode: undefined,
      graphData: { nodes: [], links: [] },
      height: 400,
      nodeId: 'id',
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
    },
  };
}
