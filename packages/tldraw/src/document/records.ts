import { createHash } from 'node:crypto';
import type { IGraphData, IGraphEdge, IGraphNode } from '@codegraphy-dev/core';
import {
  AssetRecordType,
  createShapeId,
  createTLSchema,
  toRichText,
  type TLArrowShape,
  type TLGeoShape,
  type TLImageAsset,
  type TLImageShape,
  type TLPageId,
  type TLRecord,
  type TLShape,
  type TLTextShape,
} from '@tldraw/tlschema';
import { getIndicesAbove, type IndexKey } from '@tldraw/utils';
import { createNodeDiameterMap, MINIMUM_NODE_DIAMETER } from '../graph/nodeSize/model';
import { createNodeColorMap } from './nodeColor/model';
import { createNodeIconMap, type NodeIcon } from './nodeIcon/model';

const PAGE_ID = 'page:page' as TLPageId;
const LEGACY_NODE_DIAMETER = 120;
const LABEL_WIDTH = 180;
const LABEL_GAP = 8;
const ICON_SIZE = 56;

type GeneratedKind = 'edge' | 'icon' | 'iconAsset' | 'label' | 'node';

function entityHash(kind: GeneratedKind, entityId: string): string {
  return createHash('sha256').update(`${kind}\0${entityId}`).digest('hex').slice(0, 24);
}

function shapeId(kind: Exclude<GeneratedKind, 'iconAsset'>, entityId: string) {
  return createShapeId(`codegraphy-${kind}-${entityHash(kind, entityId)}`);
}

function isOwnedRecord(record: TLRecord): boolean {
  return record.meta.codegraphyKind === 'iconAsset'
    || (record.typeName === 'shape'
      && (record.meta.codegraphyKind === 'node'
      || record.meta.codegraphyKind === 'edge'
      || record.meta.codegraphyKind === 'icon'
      || record.meta.codegraphyKind === 'label'));
}

function metadataString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function metadataNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function shouldApplyGeneratedDiameter(existing: TLGeoShape | undefined): boolean {
  if (!existing) return true;
  const previousGeneratedDiameter = metadataNumber(existing.meta.codegraphyGeneratedDiameter);
  if (previousGeneratedDiameter !== undefined) {
    return existing.props.w === previousGeneratedDiameter
      && existing.props.h === previousGeneratedDiameter;
  }
  return existing.props.w === LEGACY_NODE_DIAMETER
    && existing.props.h === LEGACY_NODE_DIAMETER;
}

function initialNodePosition(
  index: number,
  count: number,
  diameter: number,
): { x: number; y: number } {
  const radius = Math.max(320, Math.sqrt(Math.max(count, 1)) * 90);
  const angle = (index / Math.max(count, 1)) * Math.PI * 2;
  return {
    x: Math.cos(angle) * radius - diameter / 2,
    y: Math.sin(angle) * radius - diameter / 2,
  };
}

function createNodeShape(
  node: IGraphNode,
  color: TLGeoShape['props']['color'],
  diameter: number,
  index: IndexKey,
  position: { x: number; y: number },
  existing?: TLShape,
): TLGeoShape {
  const preserved = existing?.type === 'geo' ? existing : undefined;
  const applyGeneratedDiameter = shouldApplyGeneratedDiameter(preserved);
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
      codegraphyGeneratedDiameter: diameter,
      codegraphyKind: 'node',
      codegraphyNodeType: node.nodeType ?? 'file',
    },
    props: {
      url: '',
      growY: 0,
      scale: 1,
      size: 'm',
      align: 'middle',
      verticalAlign: 'middle',
      ...(preserved?.props ?? {}),
      w: applyGeneratedDiameter ? diameter : preserved?.props.w ?? diameter,
      h: applyGeneratedDiameter ? diameter : preserved?.props.h ?? diameter,
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

function createIconAsset(icon: NodeIcon): TLImageAsset {
  return AssetRecordType.create({
    id: AssetRecordType.createId(`codegraphy-icon-${entityHash('iconAsset', icon.name)}`),
    type: 'image',
    meta: {
      codegraphyIconName: icon.name,
      codegraphyKind: 'iconAsset',
    },
    props: {
      w: ICON_SIZE,
      h: ICON_SIZE,
      name: `${icon.name}.svg`,
      isAnimated: false,
      mimeType: 'image/svg+xml',
      src: icon.src,
    },
  }) as TLImageAsset;
}

function createIconShape(
  node: IGraphNode,
  icon: NodeIcon,
  asset: TLImageAsset,
  index: IndexKey,
  owner: TLGeoShape,
  existing?: TLShape,
): TLImageShape {
  const preserved = existing?.type === 'image' ? existing : undefined;
  return {
    id: shapeId('icon', node.id),
    typeName: 'shape',
    type: 'image',
    parentId: PAGE_ID,
    index,
    x: owner.x + (owner.props.w - ICON_SIZE) / 2,
    y: owner.y + (owner.props.h - ICON_SIZE) / 2,
    rotation: 0,
    isLocked: true,
    opacity: preserved?.opacity ?? 1,
    meta: {
      ...(preserved?.meta ?? {}),
      codegraphyEntityId: `icon:${node.id}`,
      codegraphyIconName: icon.name,
      codegraphyKind: 'icon',
      codegraphyNodeId: node.id,
    },
    props: {
      w: ICON_SIZE,
      h: ICON_SIZE,
      playing: false,
      url: '',
      assetId: asset.id,
      crop: null,
      flipX: false,
      flipY: false,
      altText: `${node.label} file icon`,
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
    graph.edges.length + graph.nodes.length * 3,
  );
  const colors = createNodeColorMap(graph.nodes);
  const icons = createNodeIconMap(graph.nodes);
  const nodeDiameters = createNodeDiameterMap(graph.nodes, graph.edges);
  const nodeShapes = graph.nodes.map((node, nodeIndex) => {
    const diameter = nodeDiameters.get(node.id) ?? MINIMUM_NODE_DIAMETER;
    return createNodeShape(
      node,
      colors.get(node.id) ?? 'grey',
      diameter,
      indexes[graph.edges.length + nodeIndex],
      initialNodePosition(nodeIndex, graph.nodes.length, diameter),
      existingShapes.get(node.id),
    );
  });
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
  const iconAssetsByName = new Map<string, TLImageAsset>();
  for (const icon of icons.values()) {
    if (!iconAssetsByName.has(icon.name)) iconAssetsByName.set(icon.name, createIconAsset(icon));
  }
  const iconShapes = graph.nodes.flatMap((node, nodeIndex) => {
    const icon = icons.get(node.id);
    const asset = icon ? iconAssetsByName.get(icon.name) : undefined;
    if (!icon || !asset) return [];
    return [createIconShape(
      node,
      icon,
      asset,
      indexes[graph.edges.length + graph.nodes.length + nodeIndex],
      nodeShapes[nodeIndex],
      existingShapes.get(`icon:${node.id}`),
    )];
  });
  const labelShapes = graph.nodes.map((node, nodeIndex) => createLabelShape(
    node,
    indexes[graph.edges.length + graph.nodes.length * 2 + nodeIndex],
    nodeShapes[nodeIndex],
    existingShapes.get(`label:${node.id}`),
  ));
  const userRecords = existingRecords.filter(record => !isOwnedRecord(record));
  const schema = createTLSchema();
  for (const record of iconAssetsByName.values()) schema.types.asset.validate(record);
  for (const record of [...edgeShapes, ...nodeShapes, ...iconShapes, ...labelShapes]) {
    schema.types.shape.validate(record);
  }
  return [
    ...userRecords,
    ...iconAssetsByName.values(),
    ...edgeShapes,
    ...nodeShapes,
    ...iconShapes,
    ...labelShapes,
  ];
}
