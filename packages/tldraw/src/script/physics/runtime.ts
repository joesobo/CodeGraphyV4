import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import type { TLTheme } from '@tldraw/tlschema';
import { readForceSettings, toGraphLayoutConfig, type ForceSettings } from '../forceControls/model';
import { handlePointerEvent, synchronizeDraggedNode, type DragHost, type ScriptPointerEvent } from './drag/runtime';
import { createRuntimeEngine } from './engine/model';
import { forceSettingsChanged } from './force/model';
import {
  isEdgeShape,
  isLabelShape,
  isNodeShape,
  type LabelShape,
  type NodeShape,
  type ScriptShape,
} from './shape/model';
import { graphStructureKey } from './shape/structure';
import { createShapeUpdates } from './updates/model';

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
  store: { listen(listener: () => void): () => void };
  updateTheme?(theme: TLTheme): unknown;
  updateShapes(updates: Array<Record<string, unknown>>): void;
}

export interface PhysicsScriptContext {
  editor: ScriptEditor;
  signal: AbortSignal;
}

interface PhysicsRuntime {
  dirty: boolean;
  drag: DragHost['drag'];
  edgeShapes: ScriptShape[];
  editor: ScriptEditor;
  engine?: GraphLayoutEngine;
  forceSettings: ForceSettings;
  labelShapes: LabelShape[];
  nodeShapes: NodeShape[];
  structureKey: string;
}

function rebuildRuntime(runtime: PhysicsRuntime): void {
  const shapes = runtime.editor.getCurrentPageShapes();
  runtime.structureKey = graphStructureKey(shapes);
  runtime.nodeShapes = shapes.filter(isNodeShape);
  runtime.edgeShapes = shapes.filter(isEdgeShape);
  runtime.labelShapes = shapes.filter(isLabelShape);
  runtime.engine = createRuntimeEngine(
    runtime.nodeShapes,
    runtime.edgeShapes,
    runtime.forceSettings,
  );
  runtime.dirty = false;
}

function prepareRuntimeEngine(runtime: PhysicsRuntime): void {
  if (runtime.dirty) rebuildRuntime(runtime);
}

function createDragHost(runtime: PhysicsRuntime): DragHost {
  return {
    drag: runtime.drag,
    getCurrentShapes: () => runtime.editor.getCurrentPageShapes(),
    getEngine: () => runtime.engine,
    getSelectedShapes: () => runtime.editor.getSelectedShapes?.() ?? [],
    prepareEngine: () => prepareRuntimeEngine(runtime),
  };
}

function tickRuntime(runtime: PhysicsRuntime, dragHost: DragHost): void {
  prepareRuntimeEngine(runtime);
  synchronizeDraggedNode(dragHost);
  const engine = runtime.engine;
  if (!engine || engine.settled) return;
  engine.tick();
  const updates = createShapeUpdates(
    runtime.nodeShapes,
    runtime.edgeShapes,
    runtime.labelShapes,
    engine,
  );
  runtime.editor.run(
    () => runtime.editor.updateShapes(updates),
    { history: 'ignore', ignoreShapeLock: true },
  );
}

function handleStoreChange(runtime: PhysicsRuntime): void {
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
  const nodeShapes = shapes.filter(isNodeShape);
  const edgeShapes = shapes.filter(isEdgeShape);
  const labelShapes = shapes.filter(isLabelShape);
  return {
    dirty: false,
    drag: {},
    edgeShapes,
    editor,
    engine: createRuntimeEngine(nodeShapes, edgeShapes, forceSettings),
    forceSettings,
    labelShapes,
    nodeShapes,
    structureKey: graphStructureKey(shapes),
  };
}

export function startPhysicsRuntime({ editor, signal }: PhysicsScriptContext): void {
  const runtime = createPhysicsRuntime(editor);
  const dragHost = createDragHost(runtime);
  const handleEvent = (event: ScriptPointerEvent): void => handlePointerEvent(dragHost, event);
  const handleTick = (): void => tickRuntime(runtime, dragHost);
  const stopStoreListener = editor.store.listen(() => handleStoreChange(runtime));

  editor.on('event', handleEvent);
  editor.on('tick', handleTick);
  signal.addEventListener('abort', () => {
    stopStoreListener();
    editor.off('event', handleEvent);
    editor.off('tick', handleTick);
  });
}
