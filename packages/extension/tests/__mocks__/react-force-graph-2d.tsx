/**
 * Manual mock for react-force-graph-2d in jsdom tests.
 * Renders a canvas element and provides static helpers to simulate events.
 */
import React from 'react';
import { vi } from 'vitest';

// Singleton mock methods — stable across renders so vi.fn() call counts accumulate
const mockMethods = {
  zoomToFit: vi.fn(),
  zoom: vi.fn(),
  centerAt: vi.fn(),
  refresh: vi.fn(),
  linkDirectionalArrowLength: vi.fn(),
  linkDirectionalArrowRelPos: vi.fn(),
  linkDirectionalArrowColor: vi.fn(),
  linkDirectionalParticles: vi.fn(),
  linkDirectionalParticleWidth: vi.fn(),
  linkDirectionalParticleSpeed: vi.fn(),
  linkDirectionalParticleColor: vi.fn(),
  d3Force: vi.fn().mockReturnValue({
    strength: vi.fn().mockReturnThis(),
    distance: vi.fn().mockReturnThis(),
    id: vi.fn().mockReturnThis(),
    links: vi.fn().mockReturnThis(),
  }),
  d3ReheatSimulation: vi.fn(),
  pauseAnimation: vi.fn(),
  resumeAnimation: vi.fn(),
  screen2GraphCoords: vi.fn((x: number, y: number) => ({ x, y })),
  graph2ScreenCoords: vi.fn((x: number, y: number) => ({ x, y })),
  getGraphBbox: vi.fn(() => ({ x: [-100, 100], y: [-100, 100] })),
};

// Last rendered props — used by static helpers to trigger callbacks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lastProps: Record<string, any> = {};

// Position-to-nodeId mapping for context menu hit-testing in tests
const mockNodePositions: Map<string, string> = new Map();

function posKey(x: number, y: number): string {
  return `${x},${y}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = React.forwardRef<typeof mockMethods, Record<string, any>>((props, ref) => {
  lastProps = props;
  React.useImperativeHandle(ref, () => mockMethods, []);
  return <canvas data-testid="force-graph-2d" />;
});

ForceGraph2D.displayName = 'ForceGraph2D';

// ─── Static test helpers ────────────────────────────────────────────────────

/** Simulate react-force-graph firing onNodeRightClick with a given node */
function simulateNodeRightClick(node: { id: string }) {
  if (lastProps.onNodeRightClick) {
    lastProps.onNodeRightClick(node, new MouseEvent('contextmenu'));
  }
}

/** Simulate react-force-graph firing onBackgroundRightClick */
function simulateBackgroundRightClick() {
  if (lastProps.onBackgroundRightClick) {
    lastProps.onBackgroundRightClick(new MouseEvent('contextmenu'));
  }
}

/** Simulate react-force-graph firing onLinkRightClick with a given edge */
function simulateLinkRightClick(link: { id: string; from: string; to: string }) {
  if (lastProps.onLinkRightClick) {
    lastProps.onLinkRightClick(link, new MouseEvent('contextmenu'));
  }
}

/** Simulate a node click */
function simulateNodeClick(node: { id: string }, eventInit?: MouseEventInit) {
  if (lastProps.onNodeClick) {
    lastProps.onNodeClick(node, new MouseEvent('click', eventInit));
  }
}

/** Simulate background click */
function simulateBackgroundClick() {
  if (lastProps.onBackgroundClick) {
    lastProps.onBackgroundClick(new MouseEvent('click'));
  }
}

/** Simulate node hover */
function simulateNodeHover(node: { id: string } | null) {
  if (lastProps.onNodeHover) {
    lastProps.onNodeHover(node, null);
  }
}

/** Simulate engine stop (physics stabilized) */
function simulateEngineStop() {
  if (lastProps.onEngineStop) {
    lastProps.onEngineStop();
  }
}

/** Pre-register a node ID at a given screen position (for context menu tests).
 *  When a contextmenu event fires at (x, y) and you want the Graph to treat it
 *  as a right-click on a node, call setMockNodeAtPosition THEN simulateNodeRightClick.
 */
function setMockNodeAtPosition(position: { x: number; y: number }, nodeId: string) {
  mockNodePositions.set(posKey(position.x, position.y), nodeId);
}

/** Globally mock what getNodeAt returns regardless of position */
function mockGetNodeAt(_nodeId: string | undefined) {
  // no-op: kept for API compatibility
}

/** Clear all position mocks */
function clearMockPositions() {
  mockNodePositions.clear();
}

/** Clear all handlers (call in beforeEach to reset state) */
function clearAllHandlers() {
  lastProps = {};
  mockNodePositions.clear();
  vi.clearAllMocks();
}

/** Get the last props passed to ForceGraph2D (useful for assertions) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLastProps(): Record<string, any> {
  return lastProps;
}

/** Get the mock methods object */
function getMockMethods(): typeof mockMethods {
  return mockMethods;
}

const ForceGraph2DWithHelpers = Object.assign(ForceGraph2D, {
  simulateNodeRightClick,
  simulateBackgroundRightClick,
  simulateLinkRightClick,
  simulateNodeClick,
  simulateBackgroundClick,
  simulateNodeHover,
  simulateEngineStop,
  setMockNodeAtPosition,
  mockGetNodeAt,
  clearMockPositions,
  clearAllHandlers,
  getLastProps,
  getMockMethods,
  // Legacy aliases matching old vis-network mock API used in existing tests
  getRegisteredEvents: () => Object.keys(lastProps).filter(key => key.startsWith('on')),
  getHandler: (event: string) => {
    // Map vis-network event names to react-force-graph prop names
    const map: Record<string, string> = {
      select: 'onNodeClick',
      click: 'onNodeClick',
      dragStart: 'onNodeDrag',
      dragEnd: 'onNodeDragEnd',
    };
    return lastProps[map[event] ?? event];
  },
});

export { mockMethods };
export default ForceGraph2DWithHelpers;
