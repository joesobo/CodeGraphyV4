import { describe, expect, it } from 'vitest';
import {
  companionParentAssignments,
  enclosedNodeAssignments,
  nodeDropAssignment,
} from '../../../../src/documentRuntime/physics/frameMembership/model';
import type { ScriptShape } from '../../../../src/documentRuntime/physics/shape/model';

const pageId = 'page:page';
const frame = {
  id: 'shape:frame',
  parentId: pageId,
  meta: {},
  props: { h: 400, w: 600 },
  type: 'frame',
  x: 400,
  y: 200,
} satisfies ScriptShape;
const insideNode = {
  id: 'shape:inside',
  parentId: pageId,
  meta: { codegraphyEntityId: 'inside', codegraphyKind: 'node' },
  props: { h: 120, w: 120 },
  type: 'geo',
  x: 500,
  y: 300,
} satisfies ScriptShape;
const outsideNode = {
  ...insideNode,
  id: 'shape:outside',
  meta: { codegraphyEntityId: 'outside', codegraphyKind: 'node' },
  x: 1_200,
};

describe('tldraw frame membership', () => {
  it('moves stale companions above their node in the same native frame', () => {
    const framedNode = { ...insideNode, parentId: frame.id };
    const icon = {
      id: 'shape:icon',
      parentId: pageId,
      meta: { codegraphyKind: 'icon', codegraphyNodeId: 'inside' },
      props: { h: 56, w: 56 },
      type: 'image',
      x: 0,
      y: 0,
    } satisfies ScriptShape;
    const label = {
      id: 'shape:label',
      parentId: pageId,
      meta: { codegraphyKind: 'label', codegraphyNodeId: 'inside' },
      props: { w: 180 },
      type: 'text',
      x: 0,
      y: 0,
    } satisfies ScriptShape;

    expect(companionParentAssignments(
      [frame, framedNode, icon, label],
      pageId,
    )).toEqual([
      {
        nodeEntityId: 'inside',
        parentId: frame.id,
        shapeIds: ['shape:icon', 'shape:label'],
      },
    ]);
  });

  it('assigns sibling nodes enclosed by a newly drawn frame', () => {
    expect(enclosedNodeAssignments(
      [insideNode, outsideNode, frame],
      new Set([frame.id]),
    )).toEqual([
      { nodeEntityId: 'inside', parentId: frame.id },
    ]);
  });

  it('assigns a dropped node to the topmost frame containing its center', () => {
    const topFrame = {
      ...frame,
      id: 'shape:top-frame',
      props: { h: 200, w: 300 },
      x: 450,
      y: 250,
    };

    expect(nodeDropAssignment(
      [frame, topFrame, insideNode],
      'inside',
      pageId,
    )).toEqual({
      nodeEntityId: 'inside',
      parentId: topFrame.id,
    });
  });

  it('returns a framed node to the page after it is dragged outside', () => {
    const framedOutsideNode = {
      ...outsideNode,
      parentId: frame.id,
    };

    expect(nodeDropAssignment(
      [frame, framedOutsideNode],
      'outside',
      pageId,
    )).toEqual({
      nodeEntityId: 'outside',
      parentId: pageId,
    });
  });
});
