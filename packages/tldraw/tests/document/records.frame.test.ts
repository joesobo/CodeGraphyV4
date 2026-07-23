import type { IGraphData } from '@codegraphy-dev/core';
import { createShapeId, createTLSchema, type TLRecord } from '@tldraw/tlschema';
import { describe, expect, it } from 'vitest';
import { reconcileGraphRecords } from '../../src/document/records';

const GRAPH = {
  nodes: [
    { id: 'src/a.ts', label: 'a.ts', color: '#111111', nodeType: 'file' },
    { id: 'src/b.ts', label: 'b.ts', color: '#222222', nodeType: 'file' },
  ],
  edges: [{ id: 'a-imports-b', from: 'src/a.ts', to: 'src/b.ts', kind: 'import', sources: [] }],
} satisfies IGraphData;

describe('reconcileGraphRecords frame membership', () => {
  it('preserves a surviving node and its companions inside a user-created frame', () => {
    const initial = reconcileGraphRecords([], GRAPH);
    const node = initial.find(record => record.meta.codegraphyEntityId === 'src/a.ts');
    if (node?.typeName !== 'shape' || node.type !== 'geo') {
      throw new Error('Expected generated file node');
    }
    const schema = createTLSchema();
    const frameId = createShapeId('architecture-frame');
    const frame = schema.types.shape.create({
      id: frameId,
      type: 'frame',
      parentId: 'page:page',
      index: 'a9',
      x: 400,
      y: 200,
      props: { h: 400, name: 'Architecture', w: 600 },
    });
    const framedNode = {
      ...node,
      parentId: frameId,
      x: 40,
      y: 60,
    } satisfies TLRecord;
    const existing = initial
      .filter(record => record.id !== node.id)
      .concat(framedNode, frame);

    const refreshed = reconcileGraphRecords(existing, GRAPH);
    const refreshedNode = refreshed.find(
      record => record.meta.codegraphyEntityId === 'src/a.ts',
    );
    const refreshedIcon = refreshed.find(
      record => record.meta.codegraphyNodeId === 'src/a.ts'
        && record.meta.codegraphyKind === 'icon',
    );
    const refreshedLabel = refreshed.find(
      record => record.meta.codegraphyNodeId === 'src/a.ts'
        && record.meta.codegraphyKind === 'label',
    );

    expect(refreshed).toContainEqual(frame);
    expect(refreshedNode).toMatchObject({
      parentId: frameId,
      x: 40,
      y: 60,
    });
    expect(refreshedIcon).toMatchObject({
      parentId: frameId,
      x: 40 + (node.props.w - 56) / 2,
      y: 60 + (node.props.h - 56) / 2,
    });
    expect(refreshedLabel).toMatchObject({
      parentId: frameId,
      x: 40 + (node.props.w - 180) / 2,
      y: 60 + node.props.h + 8,
    });
  });
});
