// @vitest-environment jsdom

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareGraphPhysicsFromBytes } from '@codegraphy-dev/graph-renderer';
import {
  createShapeId,
  createTLStore,
  defaultBindingUtils,
  defaultShapeTools,
  defaultShapeUtils,
  defaultTools,
  Editor,
  type TLPointerEventInfo,
} from 'tldraw';
import { afterEach, describe, expect, it } from 'vitest';
import { startPhysicsRuntime } from './runtime';

const editors: Editor[] = [];

function pointerEvent(
  name: TLPointerEventInfo['name'],
  point: { x: number; y: number },
  target: Pick<TLPointerEventInfo, 'shape' | 'target'>,
): TLPointerEventInfo {
  return {
    accelKey: false,
    altKey: false,
    button: 0,
    ctrlKey: false,
    isPen: false,
    metaKey: false,
    name,
    point,
    pointerId: 1,
    shiftKey: false,
    type: 'pointer',
    ...target,
  } as TLPointerEventInfo;
}

function createRealEditor(): Editor {
  const shapeUtils = [...defaultShapeUtils];
  const bindingUtils = [...defaultBindingUtils];
  const editor = new Editor({
    bindingUtils,
    getContainer: () => document.body,
    initialState: 'select',
    shapeUtils,
    store: createTLStore({ bindingUtils, shapeUtils }),
    tools: [...defaultTools, ...defaultShapeTools],
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  for (const editor of editors) editor.dispose();
  editors.length = 0;
});

describe('real tldraw force drag', () => {
  it('moves a connected node while a settled node follows the pointer', async () => {
    const wasm = await readFile(path.resolve(
      process.cwd(),
      '../graph-renderer/src/physics/wasm/generated/physics.wasm',
    ));
    await prepareGraphPhysicsFromBytes(wasm);
    const editor = createRealEditor();
    const nodeAId = createShapeId('codegraphy-node-a');
    const nodeBId = createShapeId('codegraphy-node-b');
    editor.createShapes([
      {
        id: nodeAId,
        meta: { codegraphyEntityId: 'a', codegraphyKind: 'node' },
        props: { geo: 'ellipse', h: 120, w: 120 },
        type: 'geo',
        x: 0,
        y: 0,
      },
      {
        id: nodeBId,
        meta: { codegraphyEntityId: 'b', codegraphyKind: 'node' },
        props: { geo: 'ellipse', h: 120, w: 120 },
        type: 'geo',
        x: 240,
        y: 0,
      },
      {
        meta: {
          codegraphyFrom: 'a',
          codegraphyKind: 'edge',
          codegraphyTo: 'b',
        },
        props: { end: { x: 240, y: 0 }, start: { x: 0, y: 0 } },
        type: 'arrow',
        x: 60,
        y: 60,
      },
    ]);
    startPhysicsRuntime({
      editor: editor as unknown as Parameters<typeof startPhysicsRuntime>[0]['editor'],
      signal: new AbortController().signal,
    });
    for (let tick = 0; tick < 400; tick += 1) editor.emit('tick', 16);

    const nodeA = editor.getShape(nodeAId);
    const nodeBBefore = editor.getShape(nodeBId);
    if (!nodeA || !nodeBBefore) throw new Error('Expected both graph nodes');
    const start = { x: nodeA.x + 60, y: nodeA.y + 60 };
    editor.select(nodeAId);
    editor.dispatch(pointerEvent('pointer_down', start, { target: 'selection' }));
    editor.dispatch(pointerEvent('pointer_move', { x: start.x + 300, y: start.y }, { target: 'canvas' }));
    for (let tick = 0; tick < 30; tick += 1) editor.emit('tick', 16);

    const nodeBAfter = editor.getShape(nodeBId);
    if (!nodeBAfter) throw new Error('Expected connected graph node');
    expect(Math.hypot(nodeBAfter.x - nodeBBefore.x, nodeBAfter.y - nodeBBefore.y)).toBeGreaterThan(1);
  });
});
