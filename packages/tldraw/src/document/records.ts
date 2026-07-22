import { createHash } from 'node:crypto';
import type { IGraphData, IGraphEdge, IGraphNode } from '@codegraphy-dev/core';
import {
  createShapeId,
  createTLSchema,
  toRichText,
  type TLArrowShape,
  type TLGeoShape,
  type TLPageId,
  type TLRecord,
  type TLShape,
  type TLTextShape,
} from '@tldraw/tlschema';
import { getIndicesAbove, type IndexKey } from '@tldraw/utils';
import { createNodeColorMap } from './nodeColor/model';

const PAGE_ID = 'page:page' as TLPageId;
const NODE_SIZE = 120;
const LABEL_WIDTH = 180;
const LABEL_GAP = 8;

function entityHash(kind: 'edge' | 'label' | 'node', entityId: string): string {
  return createHash('sha256').update(`${kind}\0${entityId}`).digest('hex').slice(0, 24);
}

function shapeId(kind: 'edge' | 'label' | 'node', entityId: string) {
  return createShapeId(`codegraphy-${kind}-${entityHash(kind, entityId)}`);
}

function isOwnedRecord(record: TLRecord): boolean {
  return record.typeName === 'shape'
    && (record.meta.codegraphyKind === 'node'
      || record.meta.codegraphyKind === 'edge'
      || record.meta.codegraphyKind === 'label');
}

function metadataString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function initialNodePosition(index: number, count: number): { x: number; y: number } {
  const radius = Math.max(320, Math.sqrt(Math.max(count, 1)) * 90);
  const angle = (index / Math.max(count, 1)) * Math.PI * 2;
  return {
    x: Math.cos(angle) * radius - NODE_SIZE / 2,
    y: Math.sin(angle) * radius - NODE_SIZE / 2,
  };
}

function createNodeShape(
  node: IGraphNode,
  color: TLGeoShape['props']['color'],
  index: IndexKey,
  position: { x: number; y: number },
  existing?: TLShape,
): TLGeoShape {
  const preserved = existing?.type === 'geo' ? existing : undefined;
  const generatedStyle = {
    labelColor: 'black',
    color,
    dash: 'draw',
    fill: 'solid',
    font: 'draw',
  } satisfies Partial<TLGeoShape['props']>;
  return {
    id: shapeId('node', node.id),
    typeName: 'shape',
    type: 'geo',
    parentId: PAGE_ID,
    index,
    x: preserved?.x ?? position.x,
    y: preserved?.y ?? position.y,
    rotation: preserved?.rotation ?? 0,
    isLocked: preserved?.isLocked ?? false,
    opacity: preserved?.opacity ?? 1,
    meta: {
      ...(preserved?.meta ?? {}),
      codegraphyEntityId: node.id,
      codegraphyKind: 'node',
      codegraphyNodeType: node.nodeType ?? 'file',
    },
    props: {
      url: '',
      w: NODE_SIZE,
      h: NODE_SIZE,
      growY: 0,
      scale: 1,
      size: 'm',
      align: 'middle',
      verticalAlign: 'middle',
      ...(preserved?.props ?? {}),
      ...generatedStyle,
      geo: 'ellipse',
      richText: toRichText(''),
    },
  };
}

function createLabelShape(
  node: IGraphNode,
  index: IndexKey,
  owner: TLGeoShape,
  existing?: TLShape,
): TLTextShape {
  const preserved = existing?.type === 'text' ? existing : undefined;
  return {
    id: shapeId('label', node.id),
    typeName: 'shape',
    type: 'text',
    parentId: PAGE_ID,
    index,
    x: owner.x + (owner.props.w - LABEL_WIDTH) / 2,
    y: owner.y + owner.props.h + LABEL_GAP,
    rotation: 0,
    isLocked: true,
    opacity: preserved?.opacity ?? 1,
    meta: {
      ...(preserved?.meta ?? {}),
      codegraphyEntityId: `label:${node.id}`,
      codegraphyKind: 'label',
      codegraphyNodeId: node.id,
    },
    props: {
      color: 'black',
      size: 's',
      font: 'draw',
      textAlign: 'middle',
      w: LABEL_WIDTH,
      richText: toRichText(node.label),
      scale: 1,
      autoSize: false,
    },
  };
}

function createEdgeShape(
  edge: IGraphEdge,
  index: IndexKey,
  from: TLGeoShape,
  to: TLGeoShape,
  existing?: TLShape,
): TLArrowShape {
  const preserved = existing?.type === 'arrow' ? existing : undefined;
  const fromCenter = { x: from.x + from.props.w / 2, y: from.y + from.props.h / 2 };
  const toCenter = { x: to.x + to.props.w / 2, y: to.y + to.props.h / 2 };
  return {
    id: shapeId('edge', edge.id),
    typeName: 'shape',
    type: 'arrow',
    parentId: PAGE_ID,
    index,
    x: fromCenter.x,
    y: fromCenter.y,
    rotation: 0,
    isLocked: false,
    opacity: preserved?.opacity ?? 0.55,
    meta: {
      ...(preserved?.meta ?? {}),
      codegraphyEntityId: edge.id,
      codegraphyFrom: edge.from,
      codegraphyKind: 'edge',
      codegraphyRelationshipKind: edge.kind,
      codegraphyTo: edge.to,
      lintIgnore: ['friendless-arrow'],
    },
    props: {
      kind: 'arc',
      labelColor: 'black',
      color: 'grey',
      fill: 'none',
      dash: 'solid',
      size: 's',
      arrowheadStart: 'none',
      arrowheadEnd: 'arrow',
      font: 'sans',
      bend: 0,
      richText: toRichText(''),
      labelPosition: 0.5,
      scale: 1,
      elbowMidPoint: 0.5,
      ...(preserved?.props ?? {}),
      start: { x: 0, y: 0 },
      end: { x: toCenter.x - fromCenter.x, y: toCenter.y - fromCenter.y },
    },
  };
}

export function reconcileGraphRecords(
  existingRecords: readonly TLRecord[],
  graph: IGraphData,
): TLRecord[] {
  const existingShapes = new Map<string, TLShape>(
    existingRecords
      .filter((record): record is TLShape => record.typeName === 'shape')
      .map(record => [metadataString(record.meta.codegraphyEntityId) ?? '', record]),
  );
  const indexes = getIndicesAbove(
    'a1' as IndexKey,
    graph.edges.length + graph.nodes.length * 2,
  );
  const colors = createNodeColorMap(graph.nodes);
  const nodeShapes = graph.nodes.map((node, nodeIndex) => createNodeShape(
    node,
    colors.get(node.id) ?? 'grey',
    indexes[graph.edges.length + nodeIndex],
    initialNodePosition(nodeIndex, graph.nodes.length),
    existingShapes.get(node.id),
  ));
  const nodesByEntityId = new Map<string, TLGeoShape>(
    nodeShapes.map(shape => [metadataString(shape.meta.codegraphyEntityId) ?? '', shape]),
  );
  const edgeShapes = graph.edges.flatMap((edge, edgeIndex) => {
    const from = nodesByEntityId.get(edge.from);
    const to = nodesByEntityId.get(edge.to);
    if (!from || !to) return [];
    return [createEdgeShape(
      edge,
      indexes[edgeIndex],
      from,
      to,
      existingShapes.get(edge.id),
    )];
  });
  const labelShapes = graph.nodes.map((node, nodeIndex) => createLabelShape(
    node,
    indexes[graph.edges.length + graph.nodes.length + nodeIndex],
    nodeShapes[nodeIndex],
    existingShapes.get(`label:${node.id}`),
  ));
  const userRecords = existingRecords.filter(record => !isOwnedRecord(record));
  const schema = createTLSchema();
  for (const record of [...edgeShapes, ...nodeShapes, ...labelShapes]) {
    schema.types.shape.validate(record);
  }
  return [...userRecords, ...edgeShapes, ...nodeShapes, ...labelShapes];
}
