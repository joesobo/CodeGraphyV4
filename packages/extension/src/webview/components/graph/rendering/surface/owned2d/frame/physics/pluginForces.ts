import {
  MAX_GRAPH_COORDINATE,
  MAX_GRAPH_VELOCITY,
  type GraphLayoutExternalForce,
} from '@codegraphy-dev/graph-renderer';
import type { FGNode } from '../../../../../model/build';
import type { OwnedGraphFrameRuntime } from '../runtime/render';
import { syncOwnedLayoutNodes, type OwnedGraphLayout } from '../../layout/runtime/model';

type KinematicsField = 'x' | 'y' | 'vx' | 'vy' | 'fx' | 'fy';
const KINEMATICS_FIELDS: readonly KinematicsField[] = ['x', 'y', 'vx', 'vy', 'fx', 'fy'];
const FIXED_X = 1 << 0;
const FIXED_Y = 1 << 1;
const KINEMATICS_CHANGED = 1 << 0;
const POSITION_CHANGED = 1 << 1;

interface FixedCoordinateState {
  masks: Uint8Array;
  x: Float32Array;
  y: Float32Array;
}

const fixedCoordinatesByLayout = new WeakMap<OwnedGraphLayout, FixedCoordinateState>();

function fixedCoordinateState(layout: OwnedGraphLayout): FixedCoordinateState {
  const existing = fixedCoordinatesByLayout.get(layout);
  if (existing?.masks.length === layout.nodes.length) return existing;
  const created = {
    masks: new Uint8Array(layout.nodes.length),
    x: new Float32Array(layout.nodes.length),
    y: new Float32Array(layout.nodes.length),
  };
  fixedCoordinatesByLayout.set(layout, created);
  return created;
}

function normalizedPluginValue(node: FGNode, field: KinematicsField): number | undefined {
  const value = node[field];
  if (value === undefined) return undefined;
  const normalized = Math.fround(value);
  if (!Number.isFinite(value) || !Number.isFinite(normalized)) {
    throw new Error(`Plugin graph force ${field} must fit the finite 32-bit float range`);
  }
  const maximum = field === 'vx' || field === 'vy'
    ? MAX_GRAPH_VELOCITY
    : MAX_GRAPH_COORDINATE;
  if (Math.abs(value) > maximum) {
    throw new Error(`Plugin graph force ${field} must have magnitude at most ${maximum}`);
  }
  return normalized;
}

function validatePluginKinematics(nodes: readonly FGNode[]): void {
  for (const node of nodes) {
    for (const field of KINEMATICS_FIELDS) normalizedPluginValue(node, field);
  }
}

function recordFixedCoordinate(
  values: Float32Array,
  index: number,
  value: number | undefined,
  mask: number,
): number {
  if (value === undefined) return 0;
  values[index] = value;
  return mask;
}

function importKinematicsValue(
  values: Float32Array,
  index: number,
  value: number | undefined,
  changeMask: number,
): number {
  if (value === undefined || values[index] === value) return 0;
  values[index] = value;
  return KINEMATICS_CHANGED | changeMask;
}

function importNodeKinematics(
  layout: OwnedGraphLayout,
  fixed: FixedCoordinateState,
  index: number,
): number {
  const node = layout.nodes[index];
  const fixedX = normalizedPluginValue(node, 'fx');
  const fixedY = normalizedPluginValue(node, 'fy');
  const fixedMask = recordFixedCoordinate(fixed.x, index, fixedX, FIXED_X)
    | recordFixedCoordinate(fixed.y, index, fixedY, FIXED_Y);
  fixed.masks[index] = fixedMask;

  return importKinematicsValue(
    layout.engine.x,
    index,
    fixedX ?? normalizedPluginValue(node, 'x'),
    POSITION_CHANGED,
  ) | importKinematicsValue(
    layout.engine.y,
    index,
    fixedY ?? normalizedPluginValue(node, 'y'),
    POSITION_CHANGED,
  ) | importKinematicsValue(
    layout.engine.vx,
    index,
    fixedX === undefined ? normalizedPluginValue(node, 'vx') : 0,
    0,
  ) | importKinematicsValue(
    layout.engine.vy,
    index,
    fixedY === undefined ? normalizedPluginValue(node, 'vy') : 0,
    0,
  );
}

export function importOwnedPluginKinematics(
  layout: OwnedGraphLayout,
): { changed: boolean; positionChanged: boolean } {
  validatePluginKinematics(layout.nodes);
  const fixed = fixedCoordinateState(layout);
  let changed = false;
  let positionChanged = false;
  for (let index = 0; index < layout.nodes.length; index += 1) {
    const imported = importNodeKinematics(layout, fixed, index);
    changed ||= (imported & KINEMATICS_CHANGED) !== 0;
    positionChanged ||= (imported & POSITION_CHANGED) !== 0;
  }
  if (changed) {
    layout.engine.setKinematics(
      layout.engine.x,
      layout.engine.y,
      layout.engine.vx,
      layout.engine.vy,
    );
  }
  return { changed, positionChanged };
}

function reassertFixedCoordinates(layout: OwnedGraphLayout): { positionChanged: boolean } {
  const fixed = fixedCoordinateState(layout);
  let positionChanged = false;
  for (let index = 0; index < fixed.masks.length; index += 1) {
    const mask = fixed.masks[index];
    if ((mask & FIXED_X) !== 0) {
      positionChanged ||= layout.engine.x[index] !== fixed.x[index];
      layout.engine.x[index] = fixed.x[index];
      layout.engine.vx[index] = 0;
    }
    if ((mask & FIXED_Y) !== 0) {
      positionChanged ||= layout.engine.y[index] !== fixed.y[index];
      layout.engine.y[index] = fixed.y[index];
      layout.engine.vy[index] = 0;
    }
  }
  return { positionChanged };
}

function reportInvalidPluginKinematics(error: unknown): void {
  console.error('[CodeGraphy] Plugin graph force produced invalid kinematics:', error);
}

function applyOwnedPluginForces(
  runtime: OwnedGraphFrameRuntime,
  layout: OwnedGraphLayout,
  alpha: number,
): void {
  if (!runtime.rendererOperationalRef.current) return;
  syncOwnedLayoutNodes(layout);
  try {
    runtime.pluginForcesRef.current.tick(alpha);
    const imported = importOwnedPluginKinematics(layout);
    if (imported.positionChanged) runtime.positionVersionRef.current += 1;
    runtime.synchronizedPositionVersionRef.current = runtime.positionVersionRef.current;
  } catch (error) {
    fixedCoordinateState(layout).masks.fill(0);
    syncOwnedLayoutNodes(layout);
    reportInvalidPluginKinematics(error);
  }
}

export function createOwnedGraphExternalForce(
  runtime: OwnedGraphFrameRuntime,
  layout: OwnedGraphLayout,
): GraphLayoutExternalForce {
  return {
    beforeIntegration: alpha => applyOwnedPluginForces(runtime, layout, alpha),
    afterIntegration: () => reassertFixedCoordinates(layout),
  };
}
