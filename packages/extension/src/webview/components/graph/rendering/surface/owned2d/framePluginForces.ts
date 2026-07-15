import type { OwnedGraphFrameRuntime } from './frame';
import { syncOwnedLayoutNodes, type OwnedGraphLayout } from './layout';

function importPluginKinematics(layout: OwnedGraphLayout): { changed: boolean; positionChanged: boolean } {
  let changed = false; let positionChanged = false;
  for (let index = 0; index < layout.nodes.length; index += 1) {
    const imported = importNodeKinematics(layout, index);
    changed ||= imported.changed;
    positionChanged ||= imported.positionChanged;
  }
  return { changed, positionChanged };
}

function importNodeKinematics(layout: OwnedGraphLayout, index: number): { changed: boolean; positionChanged: boolean } {
  const node = layout.nodes[index];
  const xChanged = importFiniteValue(layout.engine.x, index, node.x);
  const yChanged = importFiniteValue(layout.engine.y, index, node.y);
  const vxChanged = importFiniteValue(layout.engine.vx, index, node.vx);
  const vyChanged = importFiniteValue(layout.engine.vy, index, node.vy);
  return { changed: xChanged || yChanged || vxChanged || vyChanged, positionChanged: xChanged || yChanged };
}

function importFiniteValue(values: Float32Array, index: number, value: number | undefined): boolean {
  if (!Number.isFinite(value) || values[index] === value) return false;
  values[index] = value as number;
  return true;
}

export function applyOwnedPluginForces(runtime: OwnedGraphFrameRuntime, layout: OwnedGraphLayout): void {
  if (!runtime.rendererOperationalRef.current || !runtime.pluginForcesRef.current.active()) return;
  syncOwnedLayoutNodes(layout);
  runtime.pluginForcesRef.current.tick(layout.engine.alpha);
  const imported = importPluginKinematics(layout);
  if (!imported.changed) return;
  layout.engine.setKinematics(layout.engine.x, layout.engine.y, layout.engine.vx, layout.engine.vy);
  if (imported.positionChanged) runtime.positionVersionRef.current += 1;
  runtime.synchronizedPositionVersionRef.current = runtime.positionVersionRef.current;
}
