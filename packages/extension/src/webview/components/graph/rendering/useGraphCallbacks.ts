import { useRef } from 'react';
import {
  getGraphDirectionalColor,
  getGraphLinkColor,
} from './link/colors/model';
import {
  getGraphArrowRelPos,
  getGraphLinkParticles,
  getGraphLinkWidth,
} from './link/metrics';
import { renderBidirectionalLink } from './bidirectional/link';
import {
  getNodeCanvasStyle,
  paintNodePointerArea,
  renderNodeCanvas,
  renderNodeCanvasLabel,
} from './nodes/canvas2d';
import type { GraphRuntime } from '../runtime/use/state';
import type { FGLink, FGNode } from '../model/build';
import type { WebviewPluginHost } from '../../../pluginHost/manager';
import type { OwnedGraphNodeStyle } from './surface/owned2d/contracts';

export interface UseGraphCallbacksOptions {
  pluginHost?: WebviewPluginHost;
  refs: Pick<
    GraphRuntime,
    | 'directionColorRef'
    | 'directionModeRef'
    | 'edgeDecorationsRef'
    | 'graphAppearanceRef'
    | 'highlightedNeighborsRef'
    | 'highlightedNodeRef'
    | 'nodeDecorationsRef'
    | 'showLabelsRef'
    | 'themeRef'
  > & {
    selectedNodesSetRef: GraphRuntime['selection']['selectedNodeIdsRef'];
  };
  triggerImageRerender(this: void): void;
}

export interface UseGraphCallbacksResult {
  getArrowColor: (this: void, link: FGLink) => string;
  getArrowRelPos: (this: void, link: FGLink) => number;
  getLinkColor: (this: void, link: FGLink) => string;
  getLinkParticles: (this: void, link: FGLink) => number;
  getLinkWidth: (this: void, link: FGLink) => number;
  getNodeStyle?: (this: void, node: FGNode) => OwnedGraphNodeStyle;
  getParticleColor: (this: void, link: FGLink) => string;
  linkCanvasObject: (this: void, link: FGLink, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  nodeCanvasObject: (this: void, node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  nodeLabelCanvasObject?: (this: void, node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  nodePointerAreaPaint: (this: void, node: FGNode, color: string, ctx: CanvasRenderingContext2D) => void;
}

type GraphCallbackRefs = UseGraphCallbacksOptions['refs'];

interface GraphCallbackContext {
  pluginHost?: WebviewPluginHost;
  refs: GraphCallbackRefs;
  triggerImageRerender(this: void): void;
}

function getLinkRenderingContext(refs: GraphCallbackRefs) {
  return {
    directionColorRef: refs.directionColorRef,
    directionModeRef: refs.directionModeRef,
    edgeDecorationsRef: refs.edgeDecorationsRef,
    graphAppearanceRef: refs.graphAppearanceRef,
    highlightedNodeRef: refs.highlightedNodeRef,
    themeRef: refs.themeRef,
  };
}

function getNodeCanvasContext({
  pluginHost,
  refs,
  triggerImageRerender,
}: GraphCallbackContext) {
  return {
    highlightedNeighborsRef: refs.highlightedNeighborsRef,
    highlightedNodeRef: refs.highlightedNodeRef,
    nodeDecorationsRef: refs.nodeDecorationsRef,
    selectedNodesSetRef: refs.selectedNodesSetRef,
    showLabelsRef: refs.showLabelsRef,
    themeRef: refs.themeRef,
    graphAppearanceRef: refs.graphAppearanceRef,
    pluginHost,
    triggerImageRerender,
  };
}

export function useGraphCallbacks({
  pluginHost,
  refs,
  triggerImageRerender,
}: UseGraphCallbacksOptions): UseGraphCallbacksResult {
  const contextRef = useRef<GraphCallbackContext>({
    pluginHost,
    refs,
    triggerImageRerender,
  });
  const callbacksRef = useRef<UseGraphCallbacksResult | null>(null);

  contextRef.current = {
    pluginHost,
    refs,
    triggerImageRerender,
  };

  if (callbacksRef.current === null) {
    callbacksRef.current = {
      getNodeStyle(node) {
        return getNodeCanvasStyle(getNodeCanvasContext(contextRef.current), node);
      },
      nodeCanvasObject(node, ctx, globalScale) {
        renderNodeCanvas(
          getNodeCanvasContext(contextRef.current),
          node,
          ctx,
          globalScale,
        );
      },
      nodeLabelCanvasObject(node, ctx, globalScale) {
        renderNodeCanvasLabel(
          getNodeCanvasContext(contextRef.current),
          node,
          ctx,
          globalScale,
        );
      },
      nodePointerAreaPaint(node, color, ctx) {
        paintNodePointerArea(node, color, ctx);
      },
      linkCanvasObject(link, ctx, globalScale) {
        renderBidirectionalLink(
          getLinkRenderingContext(contextRef.current.refs),
          link,
          ctx,
          globalScale,
        );
      },
      getLinkColor(link) {
        return getGraphLinkColor(getLinkRenderingContext(contextRef.current.refs), link);
      },
      getLinkParticles(link) {
        return getGraphLinkParticles(getLinkRenderingContext(contextRef.current.refs), link);
      },
      getArrowRelPos(_link) {
        return getGraphArrowRelPos();
      },
      getArrowColor(_link) {
        return getGraphDirectionalColor(getLinkRenderingContext(contextRef.current.refs));
      },
      getParticleColor(_link) {
        return getGraphDirectionalColor(getLinkRenderingContext(contextRef.current.refs));
      },
      getLinkWidth(link) {
        return getGraphLinkWidth(getLinkRenderingContext(contextRef.current.refs), link);
      },
    };
  }

  return callbacksRef.current;
}
