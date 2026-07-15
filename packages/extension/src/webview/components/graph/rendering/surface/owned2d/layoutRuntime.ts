import type { MutableRefObject } from 'react';
import type { OwnedGraphCamera } from './camera';
import type { Surface2dProps } from './contracts';
import type { PointerSession } from './interaction';
import {
  applyOwnedPhysicsSettings,
  createOwnedGraphLayout,
  syncOwnedLayoutNodes,
  updateOwnedGraphLayout,
  type OwnedGraphLayout,
} from './layout';
import type { OwnedGraphPluginForces } from './pluginForces';
import { fitOwnedInitialCamera, reconcileOwnedPointerSession } from './layoutRuntimeReconcile';

export interface OwnedGraphLayoutRuntime {
  cameraRef: MutableRefObject<OwnedGraphCamera>;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  engineStopNotifiedRef: MutableRefObject<boolean>;
  hasFittedCameraRef: MutableRefObject<boolean>;
  layoutRef: MutableRefObject<OwnedGraphLayout | null>;
  pluginForcesRef: MutableRefObject<OwnedGraphPluginForces>;
  pointerSessionRef: MutableRefObject<PointerSession | null>;
  positionVersionRef: MutableRefObject<number>;
  propsRef: MutableRefObject<Surface2dProps>;
  rendererOperationalRef: MutableRefObject<boolean>;
  requestFrameRef: MutableRefObject<() => void>;
  synchronizedPositionVersionRef: MutableRefObject<number>;
}

function createOrUpdateLayout(runtime: OwnedGraphLayoutRuntime): OwnedGraphLayout {
  const currentProps = runtime.propsRef.current;
  const nodes = currentProps.sharedProps.graphData.nodes;
  const links = currentProps.sharedProps.graphData.links;
  const settings = currentProps.physicsSettings;
  const current = runtime.layoutRef.current;
  if (current) {
    updateOwnedGraphLayout(current, nodes, links, settings);
    return current;
  }
  const layout = createOwnedGraphLayout(
    nodes,
    links,
    settings,
  );
  runtime.layoutRef.current = layout;
  return layout;
}

function synchronizePluginForces(
  runtime: OwnedGraphLayoutRuntime,
  layout: OwnedGraphLayout,
): void {
  const currentProps = runtime.propsRef.current;
  const settings = currentProps.physicsSettings;
  const changed = runtime.pluginForcesRef.current.sync(
    currentProps.graphViewContributions,
    { nodes: layout.nodes, links: layout.links },
    settings,
  );
  if (changed) layout.engine.reheat();
}

function enforcePhysicsPolicy(
  runtime: OwnedGraphLayoutRuntime,
  layout: OwnedGraphLayout,
): void {
  if (!runtime.rendererOperationalRef.current) layout.engine.pause();
}

export function reconcileOwnedGraphRuntime(runtime: OwnedGraphLayoutRuntime): void {
  const layout = createOrUpdateLayout(runtime);
  synchronizePluginForces(runtime, layout);
  reconcileOwnedPointerSession(runtime, layout);
  runtime.positionVersionRef.current += 1;
  syncOwnedLayoutNodes(layout);
  runtime.synchronizedPositionVersionRef.current = runtime.positionVersionRef.current;
  fitOwnedInitialCamera(runtime, runtime.propsRef.current.sharedProps.graphData.nodes);
  enforcePhysicsPolicy(runtime, layout);
  runtime.engineStopNotifiedRef.current = false;
  runtime.requestFrameRef.current();
}

export function applyOwnedGraphRuntimePhysicsSettings(
  runtime: OwnedGraphLayoutRuntime,
): void {
  const layout = runtime.layoutRef.current;
  if (!layout) return;
  const currentProps = runtime.propsRef.current;
  const settings = currentProps.physicsSettings;
  applyOwnedPhysicsSettings(layout.engine, settings);
  runtime.pluginForcesRef.current.sync(
    currentProps.graphViewContributions,
    { nodes: layout.nodes, links: layout.links },
    settings,
  );
  runtime.engineStopNotifiedRef.current = false;
  runtime.requestFrameRef.current();
}

export function disposeOwnedGraphLayoutRuntime(runtime: OwnedGraphLayoutRuntime): void {
  runtime.pluginForcesRef.current.dispose();
  runtime.layoutRef.current = null;
}
