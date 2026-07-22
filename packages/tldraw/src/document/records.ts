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
} from '@tldraw/tlschema';
import { getIndicesAbove, type IndexKey } from '@tldraw/utils';

const PAGE_ID = 'page:page' as TLPageId;
const NODE_SIZE = 120;

function entityHash(kind: 'edge' | 'node', entityId: string): string {
  return createHash('sha256').update(`${kind}\0${entityId}`).digest('hex').slice(0, 24);
}

function shapeId(kind: 'edge' | 'node', entityId: string) {
  return createShapeId(`codegraphy-${kind}-${entityHash(kind, entityId)}`);
}

function isOwnedRecord(record: TLRecord): boolean {
  return record.typeName === 'shape'
    && (record.meta.codegraphyKind === 'node' || record.meta.codegraphyKind === 'edge');
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
  index: IndexKey,
  position: { x: number; y: number },
  existing?: TLShape,
): TLGeoShape {
  const preserved = existing?.type === 'geo' ? existing : undefined;
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
      dash: 'solid',
      url: '',
      w: NODE_SIZE,
      h: NODE_SIZE,
      growY: 0,
      scale: 1,
      labelColor: 'black',
      color: 'blue',
      fill: 'semi',
      size: 'm',
      font: 'sans',
      align: 'middle',
      verticalAlign: 'middle',
      ...(preserved?.props ?? {}),
      geo: 'ellipse',
      richText: toRichText(node.label),
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
  const indexes = getIndicesAbove('a1' as IndexKey, graph.nodes.length + graph.edges.length);
  const nodeShapes = graph.nodes.map((node, nodeIndex) => createNodeShape(
    node,
    indexes[nodeIndex],
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
      indexes[graph.nodes.length + edgeIndex],
      from,
      to,
      existingShapes.get(edge.id),
    )];
  });
  const userRecords = existingRecords.filter(record => !isOwnedRecord(record));
  const schema = createTLSchema();
  for (const record of [...nodeShapes, ...edgeShapes]) {
    schema.types.shape.validate(record);
  }
  return [...userRecords, ...edgeShapes, ...nodeShapes];
}
