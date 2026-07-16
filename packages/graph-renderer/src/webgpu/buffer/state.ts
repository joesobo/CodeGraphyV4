import type { GraphRendererFrame, GraphRendererLink, GraphRendererNode } from '../../contracts';
import { NodeStyleBuffer } from '../node/style/buffer';
import { createVertexStream, type VertexStream } from './vertexStream';

export interface GraphPassBufferState {
  linkGeometryStream: VertexStream;
  linkStyleStream: VertexStream;
  nodePositionStream: VertexStream;
  nodeStyleStream: VertexStream;
  renderedLinkCount: number;
}

export interface GraphBufferState extends GraphPassBufferState {
  indexedEdgeSources?: Uint32Array;
  indexedEdgeStride: number;
  indexedEdgeTargets?: Uint32Array;
  indexedLinks?: readonly GraphRendererLink[];
  indexedNodeCount: number;
  linkGeometryStream: VertexStream;
  linkGeometryValues: Float32Array;
  linkStyleStream: VertexStream;
  linkStyleValues: Float32Array;
  linkStyles: Float32Array;
  nodePositionStream: VertexStream;
  nodePositionValues: Float32Array;
  nodeStyles: NodeStyleBuffer;
  nodeStyleStream: VertexStream;
  renderedLinkCount: number;
  renderedLinkIndexes: Uint32Array;
  renderedLinkIndexByLink: WeakMap<GraphRendererLink, number>;
  renderedLinkOrderRevision: number;
  styleIdentity?: StyleIdentity;
  uploadedArrowsVisible: boolean;
  uploadedEdgeStride: number;
  uploadedLinks?: readonly GraphRendererLink[];
  uploadedNodes?: readonly GraphRendererNode[];
  uploadedNodeVisualScale: number;
  uploadedPositionVersion: number;
}

export interface StyleIdentity {
  arrowColor: GraphRendererFrame['getArrowColor'];
  linkColor: GraphRendererFrame['getLinkColor'];
  linkOpacity: GraphRendererFrame['getLinkOpacity'];
  linkWidth: GraphRendererFrame['getLinkWidth'];
  links: readonly GraphRendererLink[];
  nodes: readonly GraphRendererNode[];
  version: number;
}

export function createGraphBufferState(device: GPUDevice): GraphBufferState {
  return {
    indexedEdgeStride: 0,
    indexedNodeCount: -1,
    linkGeometryStream: createVertexStream(device, 'CodeGraphy link geometry'),
    linkGeometryValues: new Float32Array(),
    linkStyleStream: createVertexStream(device, 'CodeGraphy link styles'),
    linkStyleValues: new Float32Array(),
    linkStyles: new Float32Array(),
    nodePositionStream: createVertexStream(device, 'CodeGraphy node positions'),
    nodePositionValues: new Float32Array(),
    nodeStyles: new NodeStyleBuffer(),
    nodeStyleStream: createVertexStream(device, 'CodeGraphy node styles'),
    renderedLinkCount: 0,
    renderedLinkIndexes: new Uint32Array(),
    renderedLinkIndexByLink: new WeakMap(),
    renderedLinkOrderRevision: 0,
    uploadedArrowsVisible: false,
    uploadedEdgeStride: 1,
    uploadedNodeVisualScale: 1,
    uploadedPositionVersion: -1,
  };
}

export function destroyGraphBufferState(state: GraphBufferState): void {
  state.linkGeometryStream.buffer.destroy();
  state.linkStyleStream.buffer.destroy();
  state.nodePositionStream.buffer.destroy();
  state.nodeStyleStream.buffer.destroy();
}
