import { useCallback } from 'react';
import type {
  LinkObject,
  NodeObject,
} from 'react-force-graph-2d';
import {
  getGraphArrowRelPos,
  getGraphDirectionalColor,
  getGraphLinkColor,
  getGraphLinkParticles,
  getGraphLinkWidth,
  renderBidirectionalLink,
} from './links';
import { createNodeThreeObject } from './nodes3d';
import {
  paintNodePointerArea,
  renderNodeCanvas,
} from './nodes2d';
import type { UseGraphStateResult } from '../runtime/useGraphState';
import type { FGLink, FGNode } from '../../graphModel';
import type { WebviewPluginHost } from '../../../pluginHost';

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

export function useGraphCallbacks({
  pluginHost,
  refs,
  triggerImageRerender,
}: UseGraphCallbacksOptions): UseGraphCallbacksResult {
  const nodeCanvasObject = useCallback((
    node: NodeObject,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
  ) => {
    renderNodeCanvas({
      highlightedNeighborsRef: refs.highlightedNeighborsRef,
      highlightedNodeRef: refs.highlightedNodeRef,
      nodeDecorationsRef: refs.nodeDecorationsRef,
      selectedNodesSetRef: refs.selectedNodesSetRef,
      showLabelsRef: refs.showLabelsRef,
      themeRef: refs.themeRef,
      pluginHost,
      triggerImageRerender,
    }, node as FGNode, ctx, globalScale);
  }, [pluginHost, refs, triggerImageRerender]);

  const nodePointerAreaPaint = useCallback((
    node: NodeObject,
    color: string,
    ctx: CanvasRenderingContext2D,
  ) => {
    paintNodePointerArea(node as FGNode, color, ctx);
  }, []);

  const linkCanvasObject = useCallback((
    link: LinkObject,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
  ) => {
    renderBidirectionalLink({
      directionColorRef: refs.directionColorRef,
      directionModeRef: refs.directionModeRef,
      edgeDecorationsRef: refs.edgeDecorationsRef,
      highlightedNodeRef: refs.highlightedNodeRef,
      themeRef: refs.themeRef,
    }, link as FGLink, ctx, globalScale);
  }, [refs.directionColorRef, refs.directionModeRef, refs.edgeDecorationsRef, refs.highlightedNodeRef, refs.themeRef]);

  const getLinkColor = useCallback((link: LinkObject) => getGraphLinkColor({
    directionColorRef: refs.directionColorRef,
    directionModeRef: refs.directionModeRef,
    edgeDecorationsRef: refs.edgeDecorationsRef,
    highlightedNodeRef: refs.highlightedNodeRef,
    themeRef: refs.themeRef,
  }, link as FGLink), [refs.directionColorRef, refs.directionModeRef, refs.edgeDecorationsRef, refs.highlightedNodeRef, refs.themeRef]);

  const getLinkParticles = useCallback((link: LinkObject) => getGraphLinkParticles({
    directionColorRef: refs.directionColorRef,
    directionModeRef: refs.directionModeRef,
    edgeDecorationsRef: refs.edgeDecorationsRef,
    highlightedNodeRef: refs.highlightedNodeRef,
    themeRef: refs.themeRef,
  }, link as FGLink), [refs.directionColorRef, refs.directionModeRef, refs.edgeDecorationsRef, refs.highlightedNodeRef, refs.themeRef]);

  const getArrowRelPos = useCallback((_link: LinkObject) => getGraphArrowRelPos(), []);

  const getArrowColor = useCallback((_link: LinkObject) => getGraphDirectionalColor({
    directionColorRef: refs.directionColorRef,
    directionModeRef: refs.directionModeRef,
    edgeDecorationsRef: refs.edgeDecorationsRef,
    highlightedNodeRef: refs.highlightedNodeRef,
    themeRef: refs.themeRef,
  }), [refs.directionColorRef, refs.directionModeRef, refs.edgeDecorationsRef, refs.highlightedNodeRef, refs.themeRef]);

  const getParticleColor = useCallback((_link: LinkObject) => getGraphDirectionalColor({
    directionColorRef: refs.directionColorRef,
    directionModeRef: refs.directionModeRef,
    edgeDecorationsRef: refs.edgeDecorationsRef,
    highlightedNodeRef: refs.highlightedNodeRef,
    themeRef: refs.themeRef,
  }), [refs.directionColorRef, refs.directionModeRef, refs.edgeDecorationsRef, refs.highlightedNodeRef, refs.themeRef]);

  const getLinkWidth = useCallback((link: LinkObject) => getGraphLinkWidth({
    directionColorRef: refs.directionColorRef,
    directionModeRef: refs.directionModeRef,
    edgeDecorationsRef: refs.edgeDecorationsRef,
    highlightedNodeRef: refs.highlightedNodeRef,
    themeRef: refs.themeRef,
  }, link as FGLink), [refs.directionColorRef, refs.directionModeRef, refs.edgeDecorationsRef, refs.highlightedNodeRef, refs.themeRef]);

  const nodeThreeObject = useCallback((node: NodeObject) => createNodeThreeObject({
    meshesRef: refs.meshesRef,
    showLabelsRef: refs.showLabelsRef,
    spritesRef: refs.spritesRef,
  }, node as FGNode), [refs.meshesRef, refs.showLabelsRef, refs.spritesRef]);

  return {
    getArrowColor,
    getArrowRelPos,
    getLinkColor,
    getLinkParticles,
    getLinkWidth,
    getParticleColor,
    linkCanvasObject,
    nodeCanvasObject,
    nodePointerAreaPaint,
    nodeThreeObject,
  };
}
