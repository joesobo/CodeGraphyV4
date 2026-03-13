/**
 * Manual mock for react-force-graph-3d in jsdom tests.
 * Three.js/WebGL is not available in jsdom, so we render a simple div.
 */
import React from 'react';
import { vi } from 'vitest';

const mockMethods = {
  zoomToFit: vi.fn(),
  cameraPosition: vi.fn(),
  d3Force: vi.fn().mockReturnValue({
    strength: vi.fn().mockReturnThis(),
    distance: vi.fn().mockReturnThis(),
    id: vi.fn().mockReturnThis(),
  }),
  d3ReheatSimulation: vi.fn(),
  pauseAnimation: vi.fn(),
  resumeAnimation: vi.fn(),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lastProps: Record<string, any> = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph3D = React.forwardRef<typeof mockMethods, Record<string, any>>((props, ref) => {
  lastProps = props;
  React.useImperativeHandle(ref, () => mockMethods, []);
  return <div data-testid="force-graph-3d" />;
});

ForceGraph3D.displayName = 'ForceGraph3D';

function simulateNodeRightClick(node: { id: string }) {
  if (lastProps.onNodeRightClick) {
    lastProps.onNodeRightClick(node, new MouseEvent('contextmenu'));
  }
}

function simulateNodeClick(node: { id: string }, eventInit?: MouseEventInit) {
  if (lastProps.onNodeClick) {
    lastProps.onNodeClick(node, new MouseEvent('click', eventInit));
  }
}

function simulateBackgroundRightClick() {
  if (lastProps.onBackgroundRightClick) {
    lastProps.onBackgroundRightClick(new MouseEvent('contextmenu'));
  }
}

function simulateBackgroundClick(eventInit?: MouseEventInit) {
  if (lastProps.onBackgroundClick) {
    lastProps.onBackgroundClick(new MouseEvent('click', eventInit));
  }
}

function simulateLinkClick(link: { id: string; from: string; to: string }, eventInit?: MouseEventInit) {
  if (lastProps.onLinkClick) {
    lastProps.onLinkClick(link, new MouseEvent('click', eventInit));
  }
}

function simulateLinkRightClick(link: { id: string; from: string; to: string }) {
  if (lastProps.onLinkRightClick) {
    lastProps.onLinkRightClick(link, new MouseEvent('contextmenu'));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLastProps(): Record<string, any> {
  return lastProps;
}

function clearAllHandlers() {
  lastProps = {};
  vi.clearAllMocks();
}

function getMockMethods(): typeof mockMethods {
  return mockMethods;
}

const ForceGraph3DWithHelpers = Object.assign(ForceGraph3D, {
  simulateNodeClick,
  simulateNodeRightClick,
  simulateBackgroundRightClick,
  simulateBackgroundClick,
  simulateLinkClick,
  simulateLinkRightClick,
  getLastProps,
  getMockMethods,
  clearAllHandlers,
});

export { mockMethods };
export default ForceGraph3DWithHelpers;
