import type { MutableRefObject } from 'react';
import {
  getBaseGraphLinkColor,
  getGraphDirectionalColor,
  getGraphLinkColor,
} from './link/colors/model';
import {
  getBaseGraphLinkOpacity,
  getBaseGraphLinkWidth,
  getGraphLinkOpacity,
  getGraphLinkParticles,
  getGraphLinkWidth,
} from './link/metrics';
import type { NodeLabelSpriteCache } from './node/labelSprite';
import { getNodeCanvasStyle, renderNodeCanvasLabel } from './nodes/canvas2d';
import { getBaseNodeCanvasStyle } from './nodes/canvasStyle';
import type { GraphCallbackContext, UseGraphCallbacksResult } from './useGraphCallbacks';
import { createGraphBaseStyleRevision, createGraphStyleRevision } from './graphStyleRevision';

export function createGraphCallbacks(contextRef: MutableRefObject<GraphCallbackContext>, labels: NodeLabelSpriteCache): UseGraphCallbacksResult {
  const styleRevision = createGraphStyleRevision();
  const baseStyleRevision = createGraphBaseStyleRevision();
  return {
    getBaseLinkColor: link => getBaseGraphLinkColor(contextRef.current, link),
    getBaseLinkOpacity: getBaseGraphLinkOpacity,
    getBaseLinkWidth: getBaseGraphLinkWidth,
    getBaseNodeStyle: node => getBaseNodeCanvasStyle(contextRef.current, node),
    getBaseStyleRevision: baseStyleRevision,
    getNodeStyle: node => getNodeCanvasStyle(contextRef.current, node),
    getStyleRevision: () => styleRevision(contextRef.current),
    nodeLabelCanvasObject: (node, ctx, scale) => renderNodeCanvasLabel(contextRef.current, node, ctx, scale, labels),
    getLinkColor: link => getGraphLinkColor(contextRef.current, link),
    getLinkOpacity: link => getGraphLinkOpacity(contextRef.current, link),
    getLinkParticles: link => getGraphLinkParticles(contextRef.current, link),
    getArrowColor: () => getGraphDirectionalColor(contextRef.current),
    getParticleColor: () => getGraphDirectionalColor(contextRef.current),
    getLinkWidth: link => getGraphLinkWidth(contextRef.current, link),
  };
}
