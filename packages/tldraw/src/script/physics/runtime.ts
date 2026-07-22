import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { readForceSettings, toGraphLayoutConfig, type ForceSettings } from '../forceControls/model';
import { handlePointerEvent, synchronizeDraggedNode, type DragHost, type ScriptPointerEvent } from './drag/runtime';
import { createRuntimeEngine } from './engine/model';
import { forceSettingsChanged } from './force/model';
import { isEdgeShape, isNodeShape, type NodeShape, type ScriptShape } from './shape/model';
import { graphStructureKey } from './shape/structure';
import { createShapeUpdates } from './updates/model';

export interface ScriptEditor {
  getCurrentPage(): { meta: Record<string, unknown> };
  getCurrentPageShapes(): ScriptShape[];
  off(event: 'event', listener: (event: ScriptPointerEvent) => void): void;
  off(event: 'tick', listener: (elapsed: number) => void): void;
  on(event: 'event', listener: (event: ScriptPointerEvent) => void): void;
  on(event: 'tick', listener: (elapsed: number) => void): void;
  run(operation: () => void, options: { history: 'ignore' }): void;
  store: { listen(listener: () => void): () => void };
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
  nodeShapes: NodeShape[];
  structureKey: string;
}

function rebuildRuntime(runtime: PhysicsRuntime): void {
  const shapes = runtime.editor.getCurrentPageShapes();
  runtime.structureKey = graphStructureKey(shapes);
  runtime.nodeShapes = shapes.filter(isNodeShape);
  runtime.edgeShapes = shapes.filter(isEdgeShape);
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
    prepareEngine: () => prepareRuntimeEngine(runtime),
  };
}

function tickRuntime(runtime: PhysicsRuntime, dragHost: DragHost): void {
  prepareRuntimeEngine(runtime);
  synchronizeDraggedNode(dragHost);
  const engine = runtime.engine;
  if (!engine || engine.settled) return;
  engine.tick();
  const updates = createShapeUpdates(runtime.nodeShapes, runtime.edgeShapes, engine);
  runtime.editor.run(() => runtime.editor.updateShapes(updates), { history: 'ignore' });
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
  return {
    dirty: false,
    drag: {},
    edgeShapes,
    editor,
    engine: createRuntimeEngine(nodeShapes, edgeShapes, forceSettings),
    forceSettings,
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
