import {
  createGraphLayoutEngine,
  prepareGraphPhysicsFromBytes,
  type GraphLayoutEngine,
} from '@codegraphy-dev/graph-renderer';
import {
  readForceSettings,
  toGraphLayoutConfig,
} from './forceControls/model';

const PHYSICS_WASM_BASE64 = 'Q09ERUdSQVBIWV9QSFlTSUNTX1dBU00=';
const NODE_COLLISION_PADDING = 8;

interface ScriptShape {
  id: string;
  type: string;
  x: number;
  y: number;
  props: Record<string, unknown>;
  meta: Record<string, unknown>;
}

interface ScriptEditor {
  getCurrentPage(): { meta: Record<string, unknown> };
  getCurrentPageShapes(): ScriptShape[];
  off(event: 'tick', listener: (elapsed: number) => void): void;
  on(event: 'tick', listener: (elapsed: number) => void): void;
  run(operation: () => void, options: { history: 'ignore' }): void;
  store: { listen(listener: () => void): () => void };
  updateShapes(updates: Array<Record<string, unknown>>): void;
}

interface MainScriptContext {
  editor: ScriptEditor;
  signal: AbortSignal;
}

interface NodeShape extends ScriptShape {
  meta: Record<string, unknown> & { codegraphyEntityId: string; codegraphyKind: 'node' };
  props: Record<string, unknown> & { h: number; w: number };
}

function decodePhysicsBytes(): Uint8Array<ArrayBuffer> {
  const binary = atob(PHYSICS_WASM_BASE64);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function isNodeShape(shape: ScriptShape): shape is NodeShape {
  return shape.type === 'geo'
    && shape.meta.codegraphyKind === 'node'
    && typeof shape.meta.codegraphyEntityId === 'string'
    && typeof shape.props.w === 'number'
    && typeof shape.props.h === 'number';
}

export default async function runCodeGraphyPhysics({ editor, signal }: MainScriptContext): Promise<void> {
  await prepareGraphPhysicsFromBytes(decodePhysicsBytes());
  let engine: GraphLayoutEngine | undefined;
  let nodeShapes: NodeShape[] = [];
  let edgeShapes: ScriptShape[] = [];
  let writing = false;
  let dirty = true;
  let forceSettings = readForceSettings(editor.getCurrentPage().meta.codegraphyPhysics);

  function rebuild(): void {
    const shapes = editor.getCurrentPageShapes();
    nodeShapes = shapes.filter(isNodeShape);
    edgeShapes = shapes.filter(shape => shape.type === 'arrow' && shape.meta.codegraphyKind === 'edge');
    const indexes = new Map<string, number>(
      nodeShapes.map((shape, index) => [shape.meta.codegraphyEntityId, index]),
    );
    const edgeEndpoints = edgeShapes.flatMap(shape => {
      const source = indexes.get(String(shape.meta.codegraphyFrom));
      const target = indexes.get(String(shape.meta.codegraphyTo));
      return source === undefined || target === undefined ? [] : [{ source, target }];
    });
    engine = nodeShapes.length === 0 ? undefined : createGraphLayoutEngine({
      nodeIds: nodeShapes.map(shape => shape.meta.codegraphyEntityId),
      initialX: Float32Array.from(nodeShapes, shape => shape.x + shape.props.w / 2),
      initialY: Float32Array.from(nodeShapes, shape => shape.y + shape.props.h / 2),
      initialVx: new Float32Array(nodeShapes.length),
      initialVy: new Float32Array(nodeShapes.length),
      radii: Float32Array.from(nodeShapes, shape => Math.max(shape.props.w, shape.props.h) / 2),
      edgeSources: Uint32Array.from(edgeEndpoints, endpoint => endpoint.source),
      edgeTargets: Uint32Array.from(edgeEndpoints, endpoint => endpoint.target),
    }, {
      ...toGraphLayoutConfig(forceSettings),
      collisionPadding: NODE_COLLISION_PADDING,
    });
    dirty = false;
  }

  function tick(): void {
    if (dirty) rebuild();
    if (!engine || engine.settled) return;
    engine.tick();
    const nodeIndexes = new Map<string, number>(
      engine.nodeIds.map((entityId, index) => [entityId, index]),
    );
    const updates: Array<Record<string, unknown>> = nodeShapes.map((shape, index) => ({
      id: shape.id,
      type: shape.type,
      x: engine!.x[index] - shape.props.w / 2,
      y: engine!.y[index] - shape.props.h / 2,
    }));
    for (const shape of edgeShapes) {
      const source = nodeIndexes.get(String(shape.meta.codegraphyFrom));
      const target = nodeIndexes.get(String(shape.meta.codegraphyTo));
      if (source === undefined || target === undefined) continue;
      updates.push({
        id: shape.id,
        type: shape.type,
        x: engine.x[source],
        y: engine.y[source],
        props: {
          ...shape.props,
          start: { x: 0, y: 0 },
          end: {
            x: engine.x[target] - engine.x[source],
            y: engine.y[target] - engine.y[source],
          },
        },
      });
    }
    writing = true;
    try {
      editor.run(() => editor.updateShapes(updates), { history: 'ignore' });
    } finally {
      writing = false;
    }
  }

  const stopStoreListener = editor.store.listen(() => {
    if (writing) return;
    const nextForceSettings = readForceSettings(editor.getCurrentPage().meta.codegraphyPhysics);
    if (forceSettings.repelForce !== nextForceSettings.repelForce
      || forceSettings.centerForce !== nextForceSettings.centerForce
      || forceSettings.linkDistance !== nextForceSettings.linkDistance
      || forceSettings.linkForce !== nextForceSettings.linkForce) {
      forceSettings = nextForceSettings;
      engine?.setConfig(toGraphLayoutConfig(forceSettings));
      return;
    }
    dirty = true;
  });
  editor.on('tick', tick);
  signal.addEventListener('abort', () => {
    stopStoreListener();
    editor.off('tick', tick);
  });
}
