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
import {
  createNodeDiameterMap,
  MINIMUM_NODE_DIAMETER,
} from '../graph/nodeSize/model';
import { createNodeColorMap } from './nodeColor/model';
import { createNodeIconMap, type NodeIcon } from './nodeIcon/model';

const PAGE_ID = 'page:page' as TLPageId;
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

export function isCodeGraphyRecord(record: TLRecord): boolean {
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

function shouldApplyGeneratedDiameter(
  existing: TLGeoShape | undefined,
): boolean {
  if (!existing) return true;
  const previousGeneratedDiameter = metadataNumber(existing.meta.codegraphyGeneratedDiameter);
  return previousGeneratedDiameter !== undefined
    && existing.props.w === previousGeneratedDiameter
    && existing.props.h === previousGeneratedDiameter;
}

interface PreservedNodeShape {
  meta: TLGeoShape['meta'];
  props: Partial<TLGeoShape['props']>;
  shape?: TLGeoShape;
}

function preservedNodeShape(existing: TLShape | undefined): PreservedNodeShape {
  if (!existing || existing.type !== 'geo') return { meta: {}, props: {} };
  return { meta: existing.meta, props: existing.props, shape: existing };
}

function nodeDimensions(
  preserved: PreservedNodeShape,
  generatedDiameter: number,
): { h: number; w: number } {
  if (shouldApplyGeneratedDiameter(preserved.shape)) {
    return { h: generatedDiameter, w: generatedDiameter };
  }
  return {
    h: preserved.shape?.props.h ?? generatedDiameter,
    w: preserved.shape?.props.w ?? generatedDiameter,
  };
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
  const preserved = preservedNodeShape(existing);
  const dimensions = nodeDimensions(preserved, diameter);
  const generatedStyle = {
    labelColor: 'black',
    color,
    dash: 'draw',
    fill: 'solid',
    font: 'draw',
  } satisfies Partial<TLGeoShape['props']>;
  return {
    x: position.x,
    y: position.y,
    rotation: 0,
    isLocked: false,
    opacity: 1,
    ...(preserved.shape ?? {}),
    id: shapeId('node', node.id),
    typeName: 'shape',
    type: 'geo',
    parentId: preserved.shape?.parentId ?? PAGE_ID,
    index,
    meta: {
      ...preserved.meta,
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
      ...generatedStyle,
      ...preserved.props,
      ...dimensions,
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
    parentId: owner.parentId,
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
    parentId: owner.parentId,
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

interface EdgeStyle {
  dash: TLArrowShape['props']['dash'];
  font: TLArrowShape['props']['font'];
}

function edgeStyle(existing: TLArrowShape | undefined): EdgeStyle {
  if (!existing) return { dash: 'draw', font: 'draw' };
  const generatedDash = metadataString(existing.meta.codegraphyGeneratedDash);
  const generatedFont = metadataString(existing.meta.codegraphyGeneratedFont);
  return {
    dash: generatedDash === undefined
      ? existing.props.dash === 'solid' ? 'draw' : existing.props.dash
      : existing.props.dash === generatedDash ? 'draw' : existing.props.dash,
    font: generatedFont === undefined
      ? existing.props.font === 'sans' ? 'draw' : existing.props.font
      : existing.props.font === generatedFont ? 'draw' : existing.props.font,
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
  const style = edgeStyle(preserved);
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
      codegraphyGeneratedDash: 'draw',
      codegraphyGeneratedFont: 'draw',
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
      size: 's',
      arrowheadStart: 'none',
      arrowheadEnd: 'arrow',
      bend: 0,
      richText: toRichText(''),
      labelPosition: 0.5,
      scale: 1,
      elbowMidPoint: 0.5,
      ...(preserved?.props ?? {}),
      dash: style.dash,
      font: style.font,
      start: { x: 0, y: 0 },
      end: { x: toCenter.x - fromCenter.x, y: toCenter.y - fromCenter.y },
    },
  };
}

function indexExistingShapes(records: readonly TLRecord[]): ReadonlyMap<string, TLShape> {
  const shapes = new Map<string, TLShape>();
  for (const record of records) {
    if (record.typeName !== 'shape') continue;
    shapes.set(metadataString(record.meta.codegraphyEntityId) ?? '', record);
  }
  return shapes;
}

function createNodeShapes(
  graph: IGraphData,
  indexes: readonly IndexKey[],
  existingShapes: ReadonlyMap<string, TLShape>,
): TLGeoShape[] {
  const colors = createNodeColorMap(graph.nodes);
  const diameters = createNodeDiameterMap(graph.nodes, graph.edges);
  return graph.nodes.map((node, nodeIndex) => {
    const diameter = diameters.get(node.id) ?? MINIMUM_NODE_DIAMETER;
    return createNodeShape(
      node,
      colors.get(node.id) ?? 'grey',
      diameter,
      indexes[graph.edges.length + nodeIndex],
      initialNodePosition(nodeIndex, graph.nodes.length, diameter),
      existingShapes.get(node.id),
    );
  });
}

function indexNodesByEntityId(nodeShapes: readonly TLGeoShape[]): ReadonlyMap<string, TLGeoShape> {
  return new Map(nodeShapes.map(shape => [
    metadataString(shape.meta.codegraphyEntityId) ?? '',
    shape,
  ]));
}

function createEdgeShapes(
  graph: IGraphData,
  indexes: readonly IndexKey[],
  nodesByEntityId: ReadonlyMap<string, TLGeoShape>,
  existingShapes: ReadonlyMap<string, TLShape>,
): TLArrowShape[] {
  const shapes: TLArrowShape[] = [];
  for (const [edgeIndex, edge] of graph.edges.entries()) {
    const from = nodesByEntityId.get(edge.from);
    const to = nodesByEntityId.get(edge.to);
    if (!from || !to) continue;
    shapes.push(createEdgeShape(edge, indexes[edgeIndex], from, to, existingShapes.get(edge.id)));
  }
  return shapes;
}

function createIconAssets(icons: ReadonlyMap<string, NodeIcon>): ReadonlyMap<string, TLImageAsset> {
  const assets = new Map<string, TLImageAsset>();
  for (const icon of icons.values()) {
    if (!assets.has(icon.name)) assets.set(icon.name, createIconAsset(icon));
  }
  return assets;
}

function createIconShapes(
  graph: IGraphData,
  indexes: readonly IndexKey[],
  nodeShapes: readonly TLGeoShape[],
  existingShapes: ReadonlyMap<string, TLShape>,
  icons: ReadonlyMap<string, NodeIcon>,
  assets: ReadonlyMap<string, TLImageAsset>,
): TLImageShape[] {
  const shapes: TLImageShape[] = [];
  for (const [nodeIndex, node] of graph.nodes.entries()) {
    const icon = icons.get(node.id);
    const asset = icon ? assets.get(icon.name) : undefined;
    if (!icon || !asset) continue;
    shapes.push(createIconShape(
      node,
      icon,
      asset,
      indexes[graph.edges.length + graph.nodes.length + nodeIndex],
      nodeShapes[nodeIndex],
      existingShapes.get(`icon:${node.id}`),
    ));
  }
  return shapes;
}

function createLabelShapes(
  graph: IGraphData,
  indexes: readonly IndexKey[],
  nodeShapes: readonly TLGeoShape[],
  existingShapes: ReadonlyMap<string, TLShape>,
): TLTextShape[] {
  return graph.nodes.map((node, nodeIndex) => createLabelShape(
    node,
    indexes[graph.edges.length + graph.nodes.length * 2 + nodeIndex],
    nodeShapes[nodeIndex],
    existingShapes.get(`label:${node.id}`),
  ));
}

function validateGeneratedRecords(
  assets: Iterable<TLImageAsset>,
  shapes: Iterable<TLShape>,
): void {
  const schema = createTLSchema();
  for (const asset of assets) schema.types.asset.validate(asset);
  for (const shape of shapes) schema.types.shape.validate(shape);
}

export function reconcileGraphRecords(
  existingRecords: readonly TLRecord[],
  graph: IGraphData,
): TLRecord[] {
  const existingShapes = indexExistingShapes(existingRecords);
  const indexes = getIndicesAbove(
    'a1' as IndexKey,
    graph.edges.length + graph.nodes.length * 3,
  );
  const icons = createNodeIconMap(graph.nodes);
  const nodeShapes = createNodeShapes(graph, indexes, existingShapes);
  const nodesByEntityId = indexNodesByEntityId(nodeShapes);
  const edgeShapes = createEdgeShapes(graph, indexes, nodesByEntityId, existingShapes);
  const iconAssetsByName = createIconAssets(icons);
  const iconShapes = createIconShapes(
    graph,
    indexes,
    nodeShapes,
    existingShapes,
    icons,
    iconAssetsByName,
  );
  const labelShapes = createLabelShapes(graph, indexes, nodeShapes, existingShapes);
  const userRecords = existingRecords.filter(record => !isCodeGraphyRecord(record));
  const generatedShapes = [...edgeShapes, ...nodeShapes, ...iconShapes, ...labelShapes];
  validateGeneratedRecords(iconAssetsByName.values(), generatedShapes);
  return [
    ...userRecords,
    ...iconAssetsByName.values(),
    ...generatedShapes,
  ];
}
