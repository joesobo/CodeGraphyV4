import { vi } from 'vitest';
import { DEFAULT_PHYSICS_SETTINGS } from '../../../../../../../../src/shared/settings/physics';
import type { Surface2dProps } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/view/surface/contracts';

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
    getNodeStyle: vi.fn(node => ({
      borderColor: node.borderColor,
      borderWidth: node.borderWidth,
      cornerRadius: node.cornerRadius2D ?? 0,
      fillColor: node.color,
      fillOpacity: node.fillOpacity2D ?? 1,
      height: node.size * 2,
      opacity: node.baseOpacity,
      shape: node.shape2D ?? 'circle',
      width: node.size * 2,
    })),
    getParticleColor: vi.fn(() => '#ff0000'),
    getStyleRevision: vi.fn(() => 1),
    nodeLabelCanvasObject: vi.fn(),
    onRenderFramePost: vi.fn(),
    particleSize: 4,
    particleSpeed: 0.005,
    physicsSettings: DEFAULT_PHYSICS_SETTINGS,
    showFps: false,
    sharedProps: {
      graphData: { nodes: [], links: [] },
      onBackgroundClick: vi.fn(),
      onBackgroundRightClick: vi.fn(),
      onEngineStop: vi.fn(),
      onLinkClick: vi.fn(),
      onLinkRightClick: vi.fn(),
      onNodeClick: vi.fn(),
      onNodeDrag: vi.fn(),
      onNodeDragEnd: vi.fn(),
      onNodeHover: vi.fn(),
      onNodeRightClick: vi.fn(),
      width: 600,
    },
  };
}

export function createDefaultViewportSurfaceProps(): Omit<
  Surface2dProps,
  'backgroundColor' | 'directionMode'
> {
  const { backgroundColor, directionMode, ...props } = createDefaultSurfaceProps();
  void backgroundColor;
  void directionMode;
  return props;
}
