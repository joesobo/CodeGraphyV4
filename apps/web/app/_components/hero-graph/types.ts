import type { GraphLayoutInput } from '@codegraphy-dev/graph-renderer';

export interface CanvasSize {
  height: number;
  width: number;
}

export interface PointerPosition {
  active: boolean;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
}

export interface HeroGraphData {
  input: GraphLayoutInput;
  nodeGroups: Uint8Array;
  nodeHoverScales: Float32Array;
  nodeOpacities: Float32Array;
  orbitSpeedMultipliers: Float32Array;
}
