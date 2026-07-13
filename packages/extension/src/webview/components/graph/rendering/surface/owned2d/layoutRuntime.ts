import type { MutableRefObject } from 'react';
import { DEFAULT_PHYSICS_SETTINGS } from '../../../../../../shared/settings/physics';
import { fitOwnedGraphCamera, type OwnedGraphCamera } from './camera';
import { canvasSize } from './canvasGeometry';
import type { Surface2dProps } from './contracts';
import { releaseOwnedDraggedNodes } from './drag';
import type { PointerSession } from './interaction';
import {
  applyOwnedPhysicsSettings,
  canRunOwnedGraphPhysics,
  createOwnedGraphLayout,
  syncOwnedLayoutNodes,
  updateOwnedGraphLayout,
  type OwnedGraphLayout,
} from './layout';
import type { OwnedGraphPluginForces } from './pluginForces';

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
  setLayoutKind(kind: OwnedGraphLayout['kind']): void;
}

function createOrUpdateLayout(runtime: OwnedGraphLayoutRuntime): OwnedGraphLayout {
  const currentProps = runtime.propsRef.current;
  const nodes = currentProps.sharedProps.graphData.nodes;
  const links = currentProps.sharedProps.graphData.links;
  const settings = currentProps.physicsSettings ?? DEFAULT_PHYSICS_SETTINGS;
  const allowWorker = (currentProps.graphViewContributions?.forces.length ?? 0) === 0;
  const current = runtime.layoutRef.current;
  const updated = current && updateOwnedGraphLayout(
    current,
    nodes,
    links,
    settings,
    currentProps.sharedProps.dagMode ?? null,
    currentProps.sharedProps.dagLevelDistance ?? 60,
    allowWorker,
  );
  if (current && updated) return current;
  current?.engine.dispose?.();
  const layout = createOwnedGraphLayout(
    nodes,
    links,
    settings,
    currentProps.sharedProps.dagMode ?? null,
    currentProps.sharedProps.dagLevelDistance ?? 60,
    () => {
      runtime.positionVersionRef.current += 1;
      runtime.requestFrameRef.current();
    },
    allowWorker,
  );
  runtime.layoutRef.current = layout;
  return layout;
}

function synchronizePluginForces(
  runtime: OwnedGraphLayoutRuntime,
  layout: OwnedGraphLayout,
): void {
  const currentProps = runtime.propsRef.current;
  const settings = currentProps.physicsSettings ?? DEFAULT_PHYSICS_SETTINGS;
  const changed = runtime.pluginForcesRef.current.sync(
    currentProps.graphViewContributions,
    { nodes: layout.nodes, links: layout.links },
    settings,
  );
  if (changed) layout.engine.reheat();
}

function draggedNodeIndexes(layout: OwnedGraphLayout): Set<number> {
  return new Set(layout.nodes.flatMap((node, index) => node.isDragging === true ? [index] : []));
}

function finishRemovedPointerNode(
  runtime: OwnedGraphLayoutRuntime,
  layout: OwnedGraphLayout,
  session: PointerSession,
): void {
  const indexes = draggedNodeIndexes(layout);
  if (session.moved && session.node) {
    runtime.propsRef.current.sharedProps.onNodeDragEnd?.(session.node);
  }
  releaseOwnedDraggedNodes(layout, indexes);
  layout.engine.setAlphaTarget(0);
  runtime.pointerSessionRef.current = null;
}

function reconcilePointerSession(
  runtime: OwnedGraphLayoutRuntime,
  layout: OwnedGraphLayout,
): void {
  const session = runtime.pointerSessionRef.current;
  if (session?.nodeId) {
    const nextIndex = layout.engine.getNodeIndex(session.nodeId);
    if (nextIndex === undefined) {
      finishRemovedPointerNode(runtime, layout, session);
      return;
    }
    session.index = nextIndex;
    session.node = layout.nodes[nextIndex];
    session.draggedIndexes = draggedNodeIndexes(layout);
    return;
  }
  if (session?.link) {
    session.link = layout.links.find(link => link.id === session.link?.id) ?? null;
  }
}

function fitInitialCamera(
  runtime: OwnedGraphLayoutRuntime,
  nodes: Surface2dProps['sharedProps']['graphData']['nodes'],
): void {
  const canvas = runtime.canvasRef.current;
  if (!canvas || runtime.hasFittedCameraRef.current) return;
  const size = canvasSize(canvas);
  runtime.hasFittedCameraRef.current = fitOwnedGraphCamera(
    runtime.cameraRef.current,
    nodes,
    size.width,
    size.height,
  );
}

function enforcePhysicsPolicy(
  runtime: OwnedGraphLayoutRuntime,
  layout: OwnedGraphLayout,
): void {
  if (!canRunOwnedGraphPhysics(
    runtime.rendererOperationalRef.current,
    runtime.propsRef.current.physicsPaused,
  )) layout.engine.pause();
}

export function reconcileOwnedGraphRuntime(runtime: OwnedGraphLayoutRuntime): void {
  const layout = createOrUpdateLayout(runtime);
  synchronizePluginForces(runtime, layout);
  reconcilePointerSession(runtime, layout);
  runtime.positionVersionRef.current += 1;
  runtime.setLayoutKind(layout.kind);
  syncOwnedLayoutNodes(layout);
  fitInitialCamera(runtime, runtime.propsRef.current.sharedProps.graphData.nodes);
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
  const settings = currentProps.physicsSettings ?? DEFAULT_PHYSICS_SETTINGS;
  applyOwnedPhysicsSettings(layout.engine, settings);
  runtime.pluginForcesRef.current.sync(
    currentProps.graphViewContributions,
    { nodes: layout.nodes, links: layout.links },
    settings,
  );
  if (!canRunOwnedGraphPhysics(
    runtime.rendererOperationalRef.current,
    currentProps.physicsPaused,
  )) {
    layout.engine.pause();
  } else {
    layout.engine.resume();
    layout.engine.reheat();
    runtime.engineStopNotifiedRef.current = false;
  }
  runtime.requestFrameRef.current();
}

export function disposeOwnedGraphLayoutRuntime(runtime: OwnedGraphLayoutRuntime): void {
  runtime.pluginForcesRef.current.dispose();
  runtime.layoutRef.current?.engine.dispose?.();
  runtime.layoutRef.current = null;
}
