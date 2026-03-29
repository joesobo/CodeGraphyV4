import { useRef } from 'react';
import type {
  LinkObject,
  NodeObject,
} from 'react-force-graph-2d';
import {
  getGraphDirectionalColor,
  getGraphLinkColor,
} from './link/colors';
import {
  getGraphArrowRelPos,
  getGraphLinkParticles,
  getGraphLinkWidth,
} from './link/metrics';
import { renderBidirectionalLink } from './bidirectional/link';
import { createNodeThreeObject } from './nodes/canvas3d';
import {
  paintNodePointerArea,
  renderNodeCanvas,
} from './nodes/canvas2d';
import type { UseGraphStateResult } from '../runtime/use/graph/state';
import type { FGLink, FGNode } from '../model/build';
import type { WebviewPluginHost } from '../../../pluginHost/manager';

export interface UseGraphCallbacksOptions {
  pluginHost?: WebviewPluginHost;
  refs: Pick<
    UseGraphStateResult,
    | 'directionColorRef'
    | 'directionModeRef'
    | 'edgeDecorationsRef'
    | 'highlightedNeighborsRef'
    | 'highlightedNodeRef'
    | 'meshesRef'
    | 'nodeDecorationsRef'
    | 'selectedNodesSetRef'
    | 'showLabelsRef'
    | 'spritesRef'
    | 'themeRef'
  >;
  triggerImageRerender(this: void): void;
}

export interface UseGraphCallbacksResult {
  getArrowColor: (this: void, link: LinkObject) => string;
  getArrowRelPos: (this: void, link: LinkObject) => number;
  getLinkColor: (this: void, link: LinkObject) => string;
  getLinkParticles: (this: void, link: LinkObject) => number;
  getLinkWidth: (this: void, link: LinkObject) => number;
  getParticleColor: (this: void, link: LinkObject) => string;
  linkCanvasObject: (this: void, link: LinkObject, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  nodeCanvasObject: (this: void, node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  nodePointerAreaPaint: (this: void, node: NodeObject, color: string, ctx: CanvasRenderingContext2D) => void;
  nodeThreeObject: (this: void, node: NodeObject) => ReturnType<typeof createNodeThreeObject>;
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
    pluginHost,
    triggerImageRerender,
  };
}

function getNodeThreeObjectContext(refs: GraphCallbackRefs) {
  return {
    meshesRef: refs.meshesRef,
    showLabelsRef: refs.showLabelsRef,
    spritesRef: refs.spritesRef,
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
      nodeCanvasObject(node, ctx, globalScale) {
        renderNodeCanvas(
          getNodeCanvasContext(contextRef.current),
          node as FGNode,
          ctx,
          globalScale,
        );
      },
      nodePointerAreaPaint(node, color, ctx) {
        paintNodePointerArea(node as FGNode, color, ctx);
      },
      linkCanvasObject(link, ctx, globalScale) {
        renderBidirectionalLink(
          getLinkRenderingContext(contextRef.current.refs),
          link as FGLink,
          ctx,
          globalScale,
        );
      },
      getLinkColor(link) {
        return getGraphLinkColor(getLinkRenderingContext(contextRef.current.refs), link as FGLink);
      },
      getLinkParticles(link) {
        return getGraphLinkParticles(getLinkRenderingContext(contextRef.current.refs), link as FGLink);
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
        return getGraphLinkWidth(getLinkRenderingContext(contextRef.current.refs), link as FGLink);
      },
      nodeThreeObject(node) {
        return createNodeThreeObject(getNodeThreeObjectContext(contextRef.current.refs), node as FGNode);
      },
    };
  }

  return callbacksRef.current;
}
