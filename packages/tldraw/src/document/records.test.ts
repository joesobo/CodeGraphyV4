import type { IGraphData } from '@codegraphy-dev/core';
import { createShapeId, createTLSchema, toRichText, type TLRecord } from '@tldraw/tlschema';
import { describe, expect, it } from 'vitest';
import { reconcileGraphRecords } from './records';

const INITIAL_GRAPH = {
  nodes: [
    { id: 'src/a.ts', label: 'a.ts', color: '#111111', nodeType: 'file' },
    { id: 'src/b.ts', label: 'b.ts', color: '#222222', nodeType: 'file' },
  ],
  edges: [{ id: 'a-imports-b', from: 'src/a.ts', to: 'src/b.ts', kind: 'import', sources: [] }],
} satisfies IGraphData;

describe('reconcileGraphRecords', () => {
  it('sizes generated nodes from their unique connection counts within the Extension range', () => {
    const leaves = Array.from({ length: 35 }, (_, index) => ({
      id: `src/leaf-${index}.ts`,
      label: `leaf-${index}.ts`,
      color: '#111111',
      nodeType: 'file',
    }));
    const graph = {
      nodes: [
        { id: 'src/hub.ts', label: 'hub.ts', color: '#222222', nodeType: 'file' },
        ...leaves,
      ],
      edges: leaves.flatMap((leaf, index) => [
        {
          id: `hub-${index}`,
          from: 'src/hub.ts',
          to: leaf.id,
          kind: 'import' as const,
          sources: [],
        },
        {
          id: `hub-${index}-duplicate`,
          from: 'src/hub.ts',
          to: leaf.id,
          kind: 'reference' as const,
          sources: [],
        },
      ]),
    } satisfies IGraphData;

    const records = reconcileGraphRecords([], graph);
    const hub = records.find(record => record.meta.codegraphyEntityId === 'src/hub.ts');
    const leaf = records.find(record => record.meta.codegraphyEntityId === 'src/leaf-0.ts');
    if (hub?.typeName !== 'shape' || hub.type !== 'geo') throw new Error('Expected hub node');
    if (leaf?.typeName !== 'shape' || leaf.type !== 'geo') throw new Error('Expected leaf node');

    expect(hub.props).toMatchObject({ h: 180, w: 180 });
    expect(leaf.props).toMatchObject({ h: 80, w: 80 });
  });

  it('groups file extensions into solid native palette fills', () => {
    const records = reconcileGraphRecords([], {
      nodes: [
        { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD', nodeType: 'file' },
        { id: 'tests/app.ts', label: 'app.ts', color: '#93C5FD', nodeType: 'file' },
        { id: 'tools/build.py', label: 'build.py', color: '#FDE68A', nodeType: 'file' },
      ],
      edges: [],
    });
    const nodeProps: Record<string, object> = {};
    for (const record of records) {
      const entityId = record.meta.codegraphyEntityId;
      if (record.typeName === 'shape'
        && record.meta.codegraphyKind === 'node'
        && typeof entityId === 'string') {
        nodeProps[entityId] = record.props;
      }
    }

    expect(nodeProps['src/app.ts']).toMatchObject({ dash: 'draw', fill: 'solid', font: 'draw' });
    expect(nodeProps['tests/app.ts']).toMatchObject(nodeProps['src/app.ts']);
    expect(nodeProps['tools/build.py']).not.toMatchObject(nodeProps['src/app.ts']);
  });

  it('centers locked icons in nodes and stacks edges, nodes, icons, then labels', () => {
    const records = reconcileGraphRecords([], INITIAL_GRAPH);
    const node = records.find(record => record.meta.codegraphyEntityId === 'src/a.ts');
    const icon = records.find(record => (
      record.typeName === 'shape'
      && record.meta.codegraphyKind === 'icon'
      && record.meta.codegraphyNodeId === 'src/a.ts'
    ));
    const label = records.find(record => (
      record.meta.codegraphyKind === 'label'
      && record.meta.codegraphyNodeId === 'src/a.ts'
    ));
    const edge = records.find(record => record.meta.codegraphyKind === 'edge');
    if (node?.typeName !== 'shape' || node.type !== 'geo') throw new Error('Expected node');
    if (icon?.typeName !== 'shape' || icon.type !== 'image') throw new Error('Expected icon');
    if (label?.typeName !== 'shape' || label.type !== 'text') throw new Error('Expected label');
    if (edge?.typeName !== 'shape') throw new Error('Expected edge');

    expect(node.props.richText).toEqual(toRichText(''));
    expect(label).toMatchObject({
      isLocked: true,
      meta: { codegraphyKind: 'label', codegraphyNodeId: 'src/a.ts' },
      props: { color: 'black', font: 'draw', textAlign: 'middle' },
      x: node.x + (node.props.w - 180) / 2,
      y: node.y + node.props.h + 8,
    });
    expect(JSON.stringify(label.props.richText)).toContain('a.ts');
    expect(icon).toMatchObject({
      isLocked: true,
      meta: { codegraphyKind: 'icon', codegraphyNodeId: 'src/a.ts' },
      props: { altText: 'a.ts file icon', h: 56, w: 56 },
      x: node.x + (node.props.w - 56) / 2,
      y: node.y + (node.props.h - 56) / 2,
    });
    const iconAsset = records.find(record => record.id === icon.props.assetId);
    expect(iconAsset).toMatchObject({
      typeName: 'asset',
      type: 'image',
      meta: { codegraphyKind: 'iconAsset' },
    });
    expect(edge.index < node.index).toBe(true);
    expect(node.index < icon.index).toBe(true);
    expect(icon.index < label.index).toBe(true);
  });

  it('reapplies the generated visual theme during refresh', () => {
    const graph = {
      nodes: [{ id: 'tools/build.py', label: 'build.py', color: '#333333', nodeType: 'file' }],
      edges: [],
    } satisfies IGraphData;
    const initial = reconcileGraphRecords([], graph);
    const node = initial.find(record => record.meta.codegraphyEntityId === 'tools/build.py');
    if (node?.typeName !== 'shape' || node.type !== 'geo') {
      throw new Error('Expected generated file node');
    }
    const styledNode = {
      ...node,
      props: {
        ...node.props,
        color: 'red',
        fill: 'pattern',
        labelColor: 'black',
      },
    } satisfies TLRecord;

    const refreshed = reconcileGraphRecords([styledNode], graph);
    const refreshedNode = refreshed.find(record => record.meta.codegraphyEntityId === 'tools/build.py');

    expect(refreshedNode).toMatchObject({
      props: {
        color: 'blue',
        dash: 'draw',
        fill: 'solid',
        font: 'draw',
        labelColor: 'black',
      },
    });
  });

  it('preserves user shapes and surviving node positions while replacing stale graph shapes', () => {
    const initial = reconcileGraphRecords([], INITIAL_GRAPH);
    const nodeA = initial.find(record => (
      record.typeName === 'shape'
      && record.meta.codegraphyEntityId === 'src/a.ts'
    ));
    if (nodeA?.typeName !== 'shape' || nodeA.type !== 'geo') {
      throw new Error('Expected generated file node');
    }
    const movedNodeA = {
      ...nodeA,
      x: 900,
      y: 700,
      props: { ...nodeA.props, h: 240, w: 240 },
    } satisfies TLRecord;
    const schema = createTLSchema();
    const note = schema.types.shape.create({
      id: createShapeId('user-note'),
      type: 'note',
      parentId: 'page:page',
      index: 'a9',
      x: 40,
      y: 40,
      props: { richText: toRichText('Keep me') },
    });
    const existing = initial
      .filter(record => record.id !== nodeA?.id)
      .concat(movedNodeA, note);
    const updatedGraph = {
      nodes: [
        { id: 'src/a.ts', label: 'renamed.ts', color: '#111111', nodeType: 'file' },
        { id: 'src/c.ts', label: 'c.ts', color: '#333333', nodeType: 'file' },
      ],
      edges: [{ id: 'a-imports-c', from: 'src/a.ts', to: 'src/c.ts', kind: 'import', sources: [] }],
    } satisfies IGraphData;

    const refreshed = reconcileGraphRecords(existing, updatedGraph);
    const refreshedNodeA = refreshed.find(record => (
      record.typeName === 'shape'
      && record.meta.codegraphyEntityId === 'src/a.ts'
    ));

    expect(refreshed).toContainEqual(note);
    expect(refreshedNodeA).toMatchObject({
      x: 900,
      y: 700,
      props: { h: 240, w: 240 },
    });
    const refreshedLabelA = refreshed.find(record => (
      record.meta.codegraphyKind === 'label'
      && record.meta.codegraphyNodeId === 'src/a.ts'
    ));
    expect(JSON.stringify(refreshedLabelA)).toContain('renamed.ts');
    expect(refreshed.some(record => record.meta.codegraphyEntityId === 'src/b.ts')).toBe(false);
    expect(refreshed.some(record => record.meta.codegraphyEntityId === 'src/c.ts')).toBe(true);
    expect(refreshed.some(record => record.meta.codegraphyEntityId === 'a-imports-c')).toBe(true);
  });
});
