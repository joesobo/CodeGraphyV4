// @vitest-environment jsdom

import { installGeneratedGraphPhysicsForTests } from '@codegraphy-dev/graph-renderer/testing';
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
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRuntimeEngine } from '../../../src/documentRuntime/physics/engine/model';
import { startPhysicsRuntime } from '../../../src/documentRuntime/physics/runtime';

const editors: Editor[] = [];

beforeAll(() => {
  installGeneratedGraphPhysicsForTests();
});

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
  it('keeps a running node near its page position when a native frame captures it', () => {
    const editor = createRealEditor();
    const frameId = createShapeId('capture-frame');
    const nodeId = createShapeId('codegraphy-node-captured');
    editor.updatePage({
      id: editor.getCurrentPageId(),
      meta: {
        codegraphyPhysics: {
          centerForce: 0.1,
          linkDistance: 80,
          linkForce: 0,
          repelForce: 0,
        },
      },
    });
    editor.createShape({
      id: nodeId,
      meta: { codegraphyEntityId: 'captured', codegraphyKind: 'node' },
      props: { geo: 'ellipse', h: 120, w: 120 },
      type: 'geo',
      x: 500,
      y: 300,
    });
    startPhysicsRuntime({
      editor: editor as unknown as Parameters<typeof startPhysicsRuntime>[0]['editor'],
      signal: new AbortController().signal,
    });
    editor.createShape({
      id: frameId,
      props: { h: 400, name: 'Capture', w: 600 },
      type: 'frame',
      x: 400,
      y: 200,
    });
    const beforeCapture = editor.getShapePageBounds(nodeId);
    if (!beforeCapture) throw new Error('Expected node before capture');
    editor.reparentShapes([nodeId], frameId);

    for (let tick = 0; tick < 200; tick += 1) editor.emit('tick', 16);

    const afterNode = editor.getShape(nodeId);
    const afterCapture = editor.getShapePageBounds(nodeId);
    if (!afterNode || !afterCapture) throw new Error('Expected node after capture');
    expect(afterNode.parentId).toBe(frameId);
    expect(Math.hypot(
      afterCapture.center.x - beforeCapture.center.x,
      afterCapture.center.y - beforeCapture.center.y,
    )).toBeLessThan(400);
  });

  it('pulls a frame-contained node toward its native frame center', () => {
    const editor = createRealEditor();
    const frameId = createShapeId('architecture-frame');
    const nodeId = createShapeId('codegraphy-node-framed');
    editor.updatePage({
      id: editor.getCurrentPageId(),
      meta: {
        codegraphyPhysics: {
          centerForce: 0,
          linkDistance: 80,
          linkForce: 0,
          repelForce: 0,
        },
      },
    });
    editor.createShapes([
      {
        id: frameId,
        props: { h: 400, name: 'Architecture', w: 600 },
        type: 'frame',
        x: 400,
        y: 200,
      },
      {
        id: nodeId,
        meta: { codegraphyEntityId: 'framed', codegraphyKind: 'node' },
        parentId: frameId,
        props: { geo: 'ellipse', h: 120, w: 120 },
        type: 'geo',
        x: 0,
        y: 0,
      },
    ]);
    const frameBounds = editor.getShapePageBounds(frameId);
    const beforeBounds = editor.getShapePageBounds(nodeId);
    if (!frameBounds || !beforeBounds) throw new Error('Expected frame and node bounds');
    const frameCenter = frameBounds.center;
    const beforeDistance = Math.hypot(
      beforeBounds.center.x - frameCenter.x,
      beforeBounds.center.y - frameCenter.y,
    );

    startPhysicsRuntime({
      editor: editor as unknown as Parameters<typeof startPhysicsRuntime>[0]['editor'],
      signal: new AbortController().signal,
    });
    for (let tick = 0; tick < 200; tick += 1) editor.emit('tick', 16);

    const afterNode = editor.getShape(nodeId);
    const afterBounds = editor.getShapePageBounds(nodeId);
    if (!afterNode || !afterBounds) throw new Error('Expected framed node after physics');
    const afterDistance = Math.hypot(
      afterBounds.center.x - frameCenter.x,
      afterBounds.center.y - frameCenter.y,
    );
    expect(afterNode.parentId).toBe(frameId);
    expect(afterDistance).toBeLessThan(beforeDistance);

    editor.updateShape({ id: frameId, type: 'frame', props: { w: 1_000 } });
    const resizedFrameBounds = editor.getShapePageBounds(frameId);
    const beforeResizeNodeBounds = editor.getShapePageBounds(nodeId);
    if (!resizedFrameBounds || !beforeResizeNodeBounds) {
      throw new Error('Expected resized frame and node bounds');
    }
    const beforeResizeDistance = Math.hypot(
      beforeResizeNodeBounds.center.x - resizedFrameBounds.center.x,
      beforeResizeNodeBounds.center.y - resizedFrameBounds.center.y,
    );
    for (let tick = 0; tick < 200; tick += 1) editor.emit('tick', 16);
    const afterResizeNodeBounds = editor.getShapePageBounds(nodeId);
    if (!afterResizeNodeBounds) throw new Error('Expected node after frame resize');
    const afterResizeDistance = Math.hypot(
      afterResizeNodeBounds.center.x - resizedFrameBounds.center.x,
      afterResizeNodeBounds.center.y - resizedFrameBounds.center.y,
    );
    expect(afterResizeDistance).toBeLessThan(beforeResizeDistance);
  });

  it('settles mixed-size connected nodes without overlapping their padded collision bounds', async () => {
    const nodes = [
      {
        id: 'shape:small', type: 'geo', x: 0, y: 0, props: { h: 80, w: 80 },
        meta: { codegraphyEntityId: 'small', codegraphyKind: 'node' as const },
      },
      {
        id: 'shape:medium', type: 'geo', x: 600, y: 0, props: { h: 120, w: 120 },
        meta: { codegraphyEntityId: 'medium', codegraphyKind: 'node' as const },
      },
      {
        id: 'shape:large', type: 'geo', x: 1_200, y: 0, props: { h: 300, w: 300 },
        meta: { codegraphyEntityId: 'large', codegraphyKind: 'node' as const },
      },
    ];
    const edges = [
      {
        id: 'edge:small-medium', type: 'arrow', x: 0, y: 0, props: {},
        meta: { codegraphyFrom: 'small', codegraphyKind: 'edge', codegraphyTo: 'medium' },
      },
      {
        id: 'edge:medium-large', type: 'arrow', x: 0, y: 0, props: {},
        meta: { codegraphyFrom: 'medium', codegraphyKind: 'edge', codegraphyTo: 'large' },
      },
    ];
    const engine = createRuntimeEngine(nodes, edges, {
      centerForce: 0.1,
      linkDistance: 80,
      linkForce: 1,
      repelForce: 10,
    });
    if (!engine) throw new Error('Expected a graph layout engine');

    for (let tick = 0; tick < 3_000 && !engine.settled; tick += 1) engine.tick();

    expect(engine.settled).toBe(true);
    const paddedRadii = [12, 16, 34];
    for (let first = 0; first < nodes.length; first += 1) {
      for (let second = first + 1; second < nodes.length; second += 1) {
        const distance = Math.hypot(
          engine.x[first] - engine.x[second],
          engine.y[first] - engine.y[second],
        );
        expect(distance).toBeGreaterThanOrEqual(
          paddedRadii[first] + paddedRadii[second] - 0.5,
        );
      }
    }
  });

  it('moves a connected node while a settled node follows the pointer', async () => {
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
