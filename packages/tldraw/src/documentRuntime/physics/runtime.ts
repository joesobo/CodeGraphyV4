import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import type { TLTheme } from '@tldraw/tlschema';
import { readForceSettings, toGraphLayoutConfig, type ForceSettings } from '../forceControls/model';
import { handlePointerEvent, synchronizeDraggedNode, type DragHost, type ScriptPointerEvent } from './drag/runtime';
import { createRuntimeEngine } from './engine/model';
import { forceSettingsChanged } from './force/model';
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
  isNodeShape,
  type IconShape,
  type LabelShape,
  type NodeShape,
  type ScriptShape,
} from './shape/model';
import { graphStructureKey } from './shape/structure';
import {
  createShapeUpdateModel,
  createShapeUpdates,
  type ShapeUpdateModel,
} from './updates/model';

export interface ScriptEditor {
  getCurrentPage(): { meta: Record<string, unknown> };
  getCurrentPageShapes(): ScriptShape[];
  getCurrentTheme?(): TLTheme;
  getSelectedShapes?(): ScriptShape[];
  off(event: 'event', listener: (event: ScriptPointerEvent) => void): void;
  off(event: 'tick', listener: (elapsed: number) => void): void;
  on(event: 'event', listener: (event: ScriptPointerEvent) => void): void;
  on(event: 'tick', listener: (elapsed: number) => void): void;
  run(operation: () => void, options: { history: 'ignore'; ignoreShapeLock: true }): void;
  selectNone?(): unknown;
  store: { listen(listener: () => void): () => void };
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
  fitSearchWhenSettled: boolean;
  hiddenShapeIds: ReadonlySet<string>;
  iconShapes: IconShape[];
  labelShapes: LabelShape[];
  nodeShapes: NodeShape[];
  shapeUpdates?: ShapeUpdateModel;
  searchQuery: string;
  structureKey: string;
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
  );
  runtime.engine = engine;
  runtime.shapeUpdates = engine
    ? createShapeUpdateModel(
      runtime.nodeShapes,
      runtime.edgeShapes,
      runtime.iconShapes,
      runtime.labelShapes,
      engine,
    )
    : undefined;
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
    minimumX = Math.min(minimumX, shape.x);
    minimumY = Math.min(minimumY, shape.y);
    maximumX = Math.max(maximumX, shape.x + shape.props.w);
    maximumY = Math.max(maximumY, shape.y + shape.props.h);
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
    getSelectedShapes: () => (runtime.editor.getSelectedShapes?.() ?? [])
      .filter(shape => !runtime.hiddenShapeIds.has(shape.id)),
    prepareEngine: () => prepareRuntimeEngine(runtime),
  };
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
  prepareRuntimeEngine(runtime);
  synchronizeDraggedNode(dragHost);
  const engine = runtime.engine;
  const shapeUpdates = runtime.shapeUpdates;
  if (!engine || !shapeUpdates) return;
  if (engine.settled) {
    fitSettledSearch(runtime);
    return;
  }
  engine.tick();
  const updates = createShapeUpdates(shapeUpdates, engine);
  if (updates.length === 0) return;
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

function handleStoreChange(runtime: PhysicsRuntime): void {
  if (runtime.writingPhysicsUpdates) return;
  clearHiddenSelection(runtime);
  const nextForceSettings = readForceSettings(
    runtime.editor.getCurrentPage().meta.codegraphyPhysics,
  );
  if (forceSettingsChanged(runtime.forceSettings, nextForceSettings)) {
    runtime.forceSettings = nextForceSettings;
    runtime.engine?.setConfig(toGraphLayoutConfig(nextForceSettings));
  }
  if (graphStructureKey(runtime.editor.getCurrentPageShapes()) !== runtime.structureKey) {
    runtime.dirty = true;
  }
}

function createPhysicsRuntime(editor: ScriptEditor): PhysicsRuntime {
  const forceSettings = readForceSettings(editor.getCurrentPage().meta.codegraphyPhysics);
  const shapes = editor.getCurrentPageShapes();
  const projection = createSearchProjection(shapes, '');
  const nodeShapes = projection.visibleShapes.filter(isNodeShape);
  const edgeShapes = projection.visibleShapes.filter(isEdgeShape);
  const iconShapes = projection.visibleShapes.filter(isIconShape);
  const labelShapes = projection.visibleShapes.filter(isLabelShape);
  const engine = createRuntimeEngine(nodeShapes, edgeShapes, forceSettings);
  return {
    dirty: false,
    drag: {},
    edgeShapes,
    editor,
    engine,
    fitSearchWhenSettled: false,
    forceSettings,
    hiddenShapeIds: projection.hiddenShapeIds,
    iconShapes,
    labelShapes,
    nodeShapes,
    searchQuery: '',
    shapeUpdates: engine
      ? createShapeUpdateModel(nodeShapes, edgeShapes, iconShapes, labelShapes, engine)
      : undefined,
    structureKey: graphStructureKey(shapes),
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
    handlePointerEvent(dragHost, event);
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
