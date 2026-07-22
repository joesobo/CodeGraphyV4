import type { GraphRendererFrame, GraphRendererSecondaryFrame } from '../../contracts';
import {
  LINK_INSTANCE_STYLE_FLOATS,
  NODE_STYLE_FLOATS,
} from '../buffer/layout';
import type { GraphBufferState, GraphPassBufferState } from '../buffer/state';
import {
  createVertexStream,
  uploadVertexStream,
  type VertexStream,
} from '../buffer/vertexStream';
import { createLinkStyles, writeLinkStyle } from '../link/style';
import { writeNodeStyle } from '../node/style/model';
import {
  createSecondaryStyleIdentity,
  secondaryStyleIdentityChanged,
  type SecondaryStyleIdentity,
} from './identity';

export interface SecondaryStyleBuffers {
  linkCachedStyleValues: Float32Array;
  linkStyleStream: VertexStream;
  linkStyleValues: Float32Array;
  nodeStyleStream: VertexStream;
  nodeStyleValues: Float32Array;
  pass: GraphPassBufferState;
  styleIdentity?: SecondaryStyleIdentity;
}

export function createSecondaryStyleBuffers(
  device: GPUDevice,
  primary: GraphBufferState,
): SecondaryStyleBuffers {
  const linkStyleStream = createVertexStream(device, 'CodeGraphy secondary link styles');
  const nodeStyleStream = createVertexStream(device, 'CodeGraphy secondary node styles');
  return {
    linkCachedStyleValues: new Float32Array(),
    linkStyleStream,
    linkStyleValues: new Float32Array(),
    nodeStyleStream,
    nodeStyleValues: new Float32Array(),
    pass: {
      linkGeometryStream: primary.linkGeometryStream,
      linkStyleStream,
      nodePositionStream: primary.nodePositionStream,
      nodeStyleStream,
      renderedLinkCount: 0,
    },
  };
}

function packSecondaryNodeStyles(
  styles: SecondaryStyleBuffers,
  primary: GraphBufferState,
  frame: GraphRendererFrame,
  secondary: GraphRendererSecondaryFrame,
): void {
  const length = frame.nodes.length * NODE_STYLE_FLOATS;
  if (styles.nodeStyleValues.length !== length) {
    styles.nodeStyleValues = new Float32Array(length);
  }
  for (let renderedIndex = 0; renderedIndex < frame.nodes.length; renderedIndex += 1) {
    const nodeIndex = primary.nodeStyles.order.nodeIndexByRenderedIndex[renderedIndex];
    writeNodeStyle(
      styles.nodeStyleValues,
      renderedIndex,
      secondary.getNodeStyle(frame.nodes[nodeIndex]),
    );
  }
}

function packSecondaryLinkStyles(
  styles: SecondaryStyleBuffers,
  primary: GraphBufferState,
  frame: GraphRendererFrame,
  secondary: GraphRendererSecondaryFrame,
): void {
  styles.linkCachedStyleValues = createLinkStyles({
    ...frame,
    getLinkColor: secondary.getLinkColor,
    getLinkOpacity: secondary.getLinkOpacity,
    getLinkWidth: secondary.getLinkWidth,
  }, styles.linkCachedStyleValues);
  const length = primary.renderedLinkCount * LINK_INSTANCE_STYLE_FLOATS;
  if (styles.linkStyleValues.length !== length) {
    styles.linkStyleValues = new Float32Array(length);
  }
  for (let renderedIndex = 0; renderedIndex < primary.renderedLinkCount; renderedIndex += 1) {
    const linkIndex = primary.renderedLinkIndexes[renderedIndex];
    const link = frame.links[linkIndex];
    writeLinkStyle(
      styles.linkStyleValues,
      styles.linkCachedStyleValues,
      link,
      linkIndex,
      renderedIndex,
      link.curvature ?? 0,
    );
  }
}

export function updateSecondaryStyleBuffers(
  device: GPUDevice,
  styles: SecondaryStyleBuffers,
  primary: GraphBufferState,
  frame: GraphRendererFrame,
  secondary: GraphRendererSecondaryFrame,
  orderChanged = false,
): boolean {
  if (!orderChanged && !secondaryStyleIdentityChanged(
    styles.styleIdentity,
    primary,
    frame,
    secondary,
  )) return false;
  packSecondaryNodeStyles(styles, primary, frame, secondary);
  packSecondaryLinkStyles(styles, primary, frame, secondary);
  uploadVertexStream(
    device,
    styles.nodeStyleStream,
    styles.nodeStyleValues,
    styles.nodeStyleValues.byteLength,
  );
  uploadVertexStream(
    device,
    styles.linkStyleStream,
    styles.linkStyleValues,
    styles.linkStyleValues.byteLength,
  );
  styles.pass.renderedLinkCount = primary.renderedLinkCount;
  styles.styleIdentity = createSecondaryStyleIdentity(primary, frame, secondary);
  return true;
}

export function destroySecondaryStyleBuffers(styles: SecondaryStyleBuffers): void {
  styles.linkStyleStream.buffer.destroy();
  styles.nodeStyleStream.buffer.destroy();
}
