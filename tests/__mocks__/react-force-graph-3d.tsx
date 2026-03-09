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
const ForceGraph3D = React.forwardRef<typeof mockMethods, Record<string, any>>((props, ref) => {
  React.useImperativeHandle(ref, () => mockMethods, []);
  return <div data-testid="force-graph-3d" />;
});

ForceGraph3D.displayName = 'ForceGraph3D';

export { mockMethods };
export default ForceGraph3D;
