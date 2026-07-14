import React from 'react';
import { vi } from 'vitest';
import type { Surface2dProps } from '../../src/webview/components/graph/rendering/surface/owned2d/contracts';

const mockMethods = {
  getFps: vi.fn(() => null),
  getPerformance: vi.fn(() => ({ status: 'idle' as const })),
  startInteractionRecording: vi.fn(),
  startStageAttributionRecording: vi.fn(),
  stopInteractionRecording: vi.fn(() => null),
  stopStageAttributionRecording: vi.fn(() => null),
  zoomToFit: vi.fn(),
  zoom: vi.fn((scale?: number) => scale ?? 1),
  zoomBy: vi.fn(),
  centerAt: vi.fn(),
  refresh: vi.fn(),
  d3ReheatSimulation: vi.fn(),
  pauseAnimation: vi.fn(),
  resumeAnimation: vi.fn(),
  screen2GraphCoords: vi.fn((x: number, y: number) => ({ x, y })),
  updateNode: vi.fn(() => true),
  graph2ScreenCoords: vi.fn((x: number, y: number) => ({ x, y })),
};

let lastProps: Surface2dProps | undefined;
const mockNodePositions = new Map<string, string>();

export function OwnedGraphSurface2d(props: Surface2dProps): React.ReactElement {
  lastProps = props;
  props.fg2dRef.current = mockMethods;
  React.useEffect(() => () => {
    if (props.fg2dRef.current === mockMethods) props.fg2dRef.current = undefined;
  }, [props.fg2dRef]);
  return <canvas data-testid="owned-webgpu-graph" />;
}

function shared() {
  return lastProps?.sharedProps;
}

function simulateNodeRightClick(node: { id: string }) {
  shared()?.onNodeRightClick(node as never, new MouseEvent('contextmenu'));
}
function simulateBackgroundRightClick() {
  shared()?.onBackgroundRightClick(new MouseEvent('contextmenu'));
}
function simulateLinkRightClick(link: { id: string; from: string; to: string }) {
  shared()?.onLinkRightClick(link as never, new MouseEvent('contextmenu'));
}
function simulateNodeClick(node: { id: string }, eventInit?: MouseEventInit) {
  shared()?.onNodeClick(node as never, new MouseEvent('click', eventInit));
}
function simulateBackgroundClick(eventInit?: MouseEventInit) {
  shared()?.onBackgroundClick(new MouseEvent('click', eventInit));
}
function simulateLinkClick(link: { id: string; from: string; to: string }, eventInit?: MouseEventInit) {
  shared()?.onLinkClick(link as never, new MouseEvent('click', eventInit));
}
function simulateNodeHover(node: ({ id: string } & Record<string, unknown>) | null) {
  shared()?.onNodeHover(node as never);
}
function simulateEngineStop() {
  shared()?.onEngineStop();
}
function setMockNodeAtPosition(position: { x: number; y: number }, nodeId: string) {
  mockNodePositions.set(`${position.x},${position.y}`, nodeId);
}
function mockGetNodeAt(_nodeId: string | undefined) {}
function clearMockPositions() { mockNodePositions.clear(); }
function clearAllHandlers() {
  lastProps = undefined;
  mockNodePositions.clear();
  vi.clearAllMocks();
}
function getLastProps(): Surface2dProps & Surface2dProps['sharedProps'] {
  if (!lastProps) throw new Error('Owned graph surface has not rendered');
  return { ...lastProps, ...lastProps.sharedProps };
}
function getMockMethods() { return mockMethods; }

const OwnedGraphSurfaceWithHelpers = {
  simulateNodeRightClick,
  simulateBackgroundRightClick,
  simulateLinkRightClick,
  simulateNodeClick,
  simulateBackgroundClick,
  simulateLinkClick,
  simulateNodeHover,
  simulateEngineStop,
  setMockNodeAtPosition,
  mockGetNodeAt,
  clearMockPositions,
  clearAllHandlers,
  getLastProps,
  getMockMethods,
  getRegisteredEvents: () => Object.keys(shared() ?? {}).filter(key => key.startsWith('on')),
  getHandler: (event: string) => {
    const map: Record<string, keyof NonNullable<Surface2dProps['sharedProps']>> = {
      select: 'onNodeClick',
      click: 'onNodeClick',
      dragStart: 'onNodeDrag',
      dragEnd: 'onNodeDragEnd',
    };
    const key = map[event];
    return key ? shared()?.[key] : undefined;
  },
};

export { mockMethods };
export default OwnedGraphSurfaceWithHelpers;
