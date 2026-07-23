import type {
  GraphLayoutEngine,
  GraphLayoutExternalForce,
} from '@codegraphy-dev/graph-renderer';
import type { TLTheme } from '@tldraw/tlschema';
import { readForceSettings, toGraphLayoutConfig, type ForceSettings } from '../forceControls/model';
import { handlePointerEvent, synchronizeDraggedNode, type DragHost, type ScriptPointerEvent } from './drag/runtime';
import { createRuntimeEngine } from './engine/model';
import { forceSettingsChanged } from './force/model';
import { createFrameGravityForce } from './frameGravity/model';
import {
  companionParentAssignments,
  enclosedNodeAssignments,
  nodeDropAssignment,
  type FrameAssignment,
} from './frameMembership/model';
import {
  createSearchProjection,
  graphSearchEventName,
  normalizeGraphSearchQuery,
  type GraphSearchEventDetail,
} from '../search/model';
import {
  isEdgeShape,
  isIconShape,
  isLabelShape,
  isFrameShape,
  isNodeShape,
  type IconShape,
  type LabelShape,
  type NodeShape,
  type ScriptShape,
} from './shape/model';
import { shapePageBounds, type ShapeGeometryHost } from './shape/geometry';
import { graphStructureKey } from './shape/structure';
import {
  createShapeUpdateModel,
  createShapeUpdates,
  type ShapeUpdateModel,
} from './updates/model';

export interface ScriptEditor extends ShapeGeometryHost {
  getCurrentPage(): { meta: Record<string, unknown> };
  getCurrentPageId(): string;
  getCurrentPageShapes(): ScriptShape[];
  getCurrentTheme?(): TLTheme;
  getSelectedShapes?(): ScriptShape[];
  off(event: 'event', listener: (event: ScriptPointerEvent) => void): void;
  off(event: 'tick', listener: (elapsed: number) => void): void;
  on(event: 'event', listener: (event: ScriptPointerEvent) => void): void;
  on(event: 'tick', listener: (elapsed: number) => void): void;
  reparentShapes(shapeIds: string[], parentId: string): unknown;
  run(operation: () => void, options: { history: 'ignore'; ignoreShapeLock: true }): void;
  store: { listen(listener: () => void): () => void };
  selectNone?(): unknown;
  updateTheme?(theme: TLTheme): unknown;
  updateShapes(updates: Array<Record<string, unknown>>): void;
  zoomToBounds?(
    bounds: { h: number; w: number; x: number; y: number },
    options: {
      animation: { duration: number };
      inset: number;
      targetZoom: number;
    },
  ): unknown;
}

export interface PhysicsScriptContext {
  editor: ScriptEditor;
  searchEvents?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
  signal: AbortSignal;
}

interface PhysicsRuntime {
  dirty: boolean;
  drag: DragHost['drag'];
  edgeShapes: ScriptShape[];
  editor: ScriptEditor;
  engine?: GraphLayoutEngine;
  forceSettings: ForceSettings;
  frameGravity?: GraphLayoutExternalForce;
  hiddenShapeIds: ReadonlySet<string>;
  fitSearchWhenSettled: boolean;
  iconShapes: IconShape[];
  labelShapes: LabelShape[];
  nodeShapes: NodeShape[];
  shapeUpdates?: ShapeUpdateModel;
  searchQuery: string;
  knownFrameIds: Set<string>;
  pendingFrameIds: Set<string>;
  pendingNodeDrop?: string;
  structureKey: string;
  synchronizeNodeIds: Set<string>;
  writingPhysicsUpdates: boolean;
}

function rebuildRuntime(runtime: PhysicsRuntime): void {
  const shapes = runtime.editor.getCurrentPageShapes();
  const projection = createSearchProjection(shapes, runtime.searchQuery);
  const visibleShapes = projection.visibleShapes;
  runtime.hiddenShapeIds = projection.hiddenShapeIds;
  runtime.structureKey = graphStructureKey(shapes);
  runtime.nodeShapes = visibleShapes.filter(isNodeShape);
  runtime.edgeShapes = visibleShapes.filter(isEdgeShape);
  runtime.iconShapes = visibleShapes.filter(isIconShape);
  runtime.labelShapes = visibleShapes.filter(isLabelShape);
  const engine = createRuntimeEngine(
    runtime.nodeShapes,
    runtime.edgeShapes,
    runtime.forceSettings,
    runtime.editor,
  );
  runtime.engine = engine;
  runtime.frameGravity = engine
    ? createFrameGravityForce(
      visibleShapes,
      engine,
      runtime.forceSettings.centerForce,
      runtime.editor,
    )
    : undefined;
  runtime.shapeUpdates = engine
    ? createShapeUpdateModel(
      runtime.nodeShapes,
      runtime.edgeShapes,
      runtime.iconShapes,
      runtime.labelShapes,
      engine,
      runtime.editor,
      runtime.editor.getCurrentPageId(),
      runtime.synchronizeNodeIds,
    )
    : undefined;
  runtime.synchronizeNodeIds.clear();
  runtime.dirty = false;
}

function prepareRuntimeEngine(runtime: PhysicsRuntime): void {
  if (runtime.dirty) rebuildRuntime(runtime);
}

function fitSettledSearch(runtime: PhysicsRuntime): void {
  if (!runtime.fitSearchWhenSettled) return;
  const nodeShapes = createSearchProjection(
    runtime.editor.getCurrentPageShapes(),
    runtime.searchQuery,
  ).visibleShapes.filter(isNodeShape);
  if (nodeShapes.length === 0) return;
  let minimumX = Number.POSITIVE_INFINITY;
  let minimumY = Number.POSITIVE_INFINITY;
  let maximumX = Number.NEGATIVE_INFINITY;
  let maximumY = Number.NEGATIVE_INFINITY;
  for (const shape of nodeShapes) {
    const bounds = shapePageBounds(shape, runtime.editor);
    minimumX = Math.min(minimumX, bounds.x);
    minimumY = Math.min(minimumY, bounds.y);
    maximumX = Math.max(maximumX, bounds.x + bounds.w);
    maximumY = Math.max(maximumY, bounds.y + bounds.h);
  }
  runtime.editor.zoomToBounds?.({
    h: maximumY - minimumY,
    w: maximumX - minimumX,
    x: minimumX,
    y: minimumY,
  }, {
    animation: { duration: 200 },
    inset: 160,
    targetZoom: 1,
  });
  runtime.fitSearchWhenSettled = false;
}

function createDragHost(runtime: PhysicsRuntime): DragHost {
  return {
    drag: runtime.drag,
    getCurrentShapes: () => runtime.editor.getCurrentPageShapes(),
    getEngine: () => runtime.engine,
    getShapePageBounds: shape => runtime.editor.getShapePageBounds?.(shape),
    getSelectedShapes: () => (runtime.editor.getSelectedShapes?.() ?? [])
      .filter(shape => !runtime.hiddenShapeIds.has(shape.id)),
    prepareEngine: () => prepareRuntimeEngine(runtime),
  };
}

function assignmentShapeIds(
  shapes: readonly ScriptShape[],
  assignment: FrameAssignment,
): string[] {
  return shapes
    .filter(shape => (
      isNodeShape(shape)
        ? shape.meta.codegraphyEntityId === assignment.nodeEntityId
        : (isIconShape(shape) || isLabelShape(shape))
          && shape.meta.codegraphyNodeId === assignment.nodeEntityId
    ))
    .map(shape => shape.id);
}

function applyFrameMembership(runtime: PhysicsRuntime): void {
  if (
    !runtime.dirty
    && runtime.pendingFrameIds.size === 0
    && runtime.pendingNodeDrop === undefined
  ) return;
  const shapes = runtime.editor.getCurrentPageShapes();
  const pageId = runtime.editor.getCurrentPageId();
  const companionAssignments = companionParentAssignments(shapes, pageId);
  if (
    runtime.pendingFrameIds.size === 0
    && runtime.pendingNodeDrop === undefined
    && companionAssignments.length === 0
  ) return;
  const assignments = new Map<string, FrameAssignment>();
  for (const assignment of enclosedNodeAssignments(
    shapes,
    runtime.pendingFrameIds,
    runtime.editor,
  )) {
    assignments.set(assignment.nodeEntityId, assignment);
  }
  if (runtime.pendingNodeDrop !== undefined) {
    const assignment = nodeDropAssignment(
      shapes,
      runtime.pendingNodeDrop,
      pageId,
      runtime.editor,
    );
    if (assignment) assignments.set(assignment.nodeEntityId, assignment);
  }
  runtime.pendingFrameIds.clear();
  runtime.pendingNodeDrop = undefined;
  if (assignments.size === 0 && companionAssignments.length === 0) return;
  for (const assignment of assignments.values()) {
    runtime.synchronizeNodeIds.add(assignment.nodeEntityId);
  }
  for (const assignment of companionAssignments) {
    runtime.synchronizeNodeIds.add(assignment.nodeEntityId);
  }
  runtime.editor.run(() => {
    for (const assignment of assignments.values()) {
      const shapeIds = assignmentShapeIds(shapes, assignment);
      if (shapeIds.length > 0) {
        runtime.editor.reparentShapes(shapeIds, assignment.parentId);
      }
    }
    for (const assignment of companionAssignments) {
      runtime.editor.reparentShapes(assignment.shapeIds, assignment.parentId);
    }
  }, { history: 'ignore', ignoreShapeLock: true });
  runtime.dirty = true;
}

function clearHiddenSelection(runtime: PhysicsRuntime, eventShape?: ScriptShape): boolean {
  const selectedHiddenShape = (runtime.editor.getSelectedShapes?.() ?? [])
    .some(shape => runtime.hiddenShapeIds.has(shape.id));
  if (!selectedHiddenShape && (!eventShape || !runtime.hiddenShapeIds.has(eventShape.id))) {
    return false;
  }
  runtime.editor.selectNone?.();
  return true;
}

function tickRuntime(runtime: PhysicsRuntime, dragHost: DragHost): void {
  applyFrameMembership(runtime);
  prepareRuntimeEngine(runtime);
  synchronizeDraggedNode(dragHost);
  const engine = runtime.engine;
  const shapeUpdates = runtime.shapeUpdates;
  if (!engine || !shapeUpdates) return;
  if (!engine.settled) engine.tick(runtime.frameGravity);
  const updates = createShapeUpdates(shapeUpdates, engine);
  if (updates.length > 0) {
    runtime.editor.run(
      () => {
        runtime.writingPhysicsUpdates = true;
        try {
          runtime.editor.updateShapes(updates);
        } finally {
          runtime.writingPhysicsUpdates = false;
        }
      },
      { history: 'ignore', ignoreShapeLock: true },
    );
  }
  if (engine.settled) fitSettledSearch(runtime);
}

function handleStoreChange(runtime: PhysicsRuntime): void {
  if (runtime.writingPhysicsUpdates) return;
  const shapes = runtime.editor.getCurrentPageShapes();
  const frameIds = new Set(shapes.filter(isFrameShape).map(frame => frame.id));
  for (const frameId of frameIds) {
    if (!runtime.knownFrameIds.has(frameId)) runtime.pendingFrameIds.add(frameId);
  }
  runtime.knownFrameIds = frameIds;
  clearHiddenSelection(runtime);
  const nextForceSettings = readForceSettings(
    runtime.editor.getCurrentPage().meta.codegraphyPhysics,
  );
  if (forceSettingsChanged(runtime.forceSettings, nextForceSettings)) {
    runtime.forceSettings = nextForceSettings;
    const engine = runtime.engine;
    engine?.setConfig(toGraphLayoutConfig(nextForceSettings));
    runtime.frameGravity = engine
      ? createFrameGravityForce(
        createSearchProjection(
          runtime.editor.getCurrentPageShapes(),
          runtime.searchQuery,
        ).visibleShapes,
        engine,
        nextForceSettings.centerForce,
        runtime.editor,
      )
      : undefined;
  }
  if (graphStructureKey(shapes) !== runtime.structureKey) {
    runtime.dirty = true;
  }
}

function createPhysicsRuntime(editor: ScriptEditor): PhysicsRuntime {
  const forceSettings = readForceSettings(editor.getCurrentPage().meta.codegraphyPhysics);
  const shapes = editor.getCurrentPageShapes();
  const pageId = editor.getCurrentPageId();
  const projection = createSearchProjection(shapes, '');
  const nodeShapes = projection.visibleShapes.filter(isNodeShape);
  const edgeShapes = projection.visibleShapes.filter(isEdgeShape);
  const iconShapes = projection.visibleShapes.filter(isIconShape);
  const labelShapes = projection.visibleShapes.filter(isLabelShape);
  const engine = createRuntimeEngine(nodeShapes, edgeShapes, forceSettings, editor);
  return {
    dirty: companionParentAssignments(shapes, pageId).length > 0,
    drag: {},
    edgeShapes,
    editor,
    engine,
    fitSearchWhenSettled: false,
    forceSettings,
    frameGravity: engine
      ? createFrameGravityForce(shapes, engine, forceSettings.centerForce, editor)
      : undefined,
    iconShapes,
    hiddenShapeIds: projection.hiddenShapeIds,
    knownFrameIds: new Set(shapes.filter(isFrameShape).map(frame => frame.id)),
    labelShapes,
    nodeShapes,
    pendingFrameIds: new Set<string>(),
    searchQuery: '',
    shapeUpdates: engine
      ? createShapeUpdateModel(
        nodeShapes,
        edgeShapes,
        iconShapes,
        labelShapes,
        engine,
        editor,
        pageId,
      )
      : undefined,
    structureKey: graphStructureKey(shapes),
    synchronizeNodeIds: new Set<string>(),
    writingPhysicsUpdates: false,
  };
}

export function startPhysicsRuntime({
  editor,
  searchEvents = typeof window === 'undefined' ? undefined : window,
  signal,
}: PhysicsScriptContext): void {
  const runtime = createPhysicsRuntime(editor);
  const dragHost = createDragHost(runtime);
  const handleEvent = (event: ScriptPointerEvent): void => {
    if (event.name === 'pointer_down' && clearHiddenSelection(runtime, event.shape)) return;
    const droppedNode = handlePointerEvent(dragHost, event);
    if (droppedNode !== undefined) runtime.pendingNodeDrop = droppedNode;
  };
  const handleTick = (): void => tickRuntime(runtime, dragHost);
  const handleSearch = (event: Event): void => {
    const detail = (event as CustomEvent<GraphSearchEventDetail>).detail;
    if (typeof detail?.query !== 'string') return;
    const nextQuery = normalizeGraphSearchQuery(detail.query);
    if (nextQuery === runtime.searchQuery) return;
    runtime.searchQuery = nextQuery;
    runtime.hiddenShapeIds = createSearchProjection(
      runtime.editor.getCurrentPageShapes(),
      nextQuery,
    ).hiddenShapeIds;
    clearHiddenSelection(runtime);
    runtime.fitSearchWhenSettled = true;
    runtime.dirty = true;
  };
  const stopStoreListener = editor.store.listen(() => handleStoreChange(runtime));

  editor.on('event', handleEvent);
  editor.on('tick', handleTick);
  searchEvents?.addEventListener(graphSearchEventName, handleSearch);
  signal.addEventListener('abort', () => {
    stopStoreListener();
    editor.off('event', handleEvent);
    editor.off('tick', handleTick);
    searchEvents?.removeEventListener(graphSearchEventName, handleSearch);
  });
}
