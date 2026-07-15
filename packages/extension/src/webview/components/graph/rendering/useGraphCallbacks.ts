import { useRef } from 'react';
import {
  getGraphDirectionalColor,
  getGraphLinkColor,
} from './link/colors/model';
import {
  getGraphLinkOpacity,
  getGraphLinkParticles,
  getGraphLinkWidth,
} from './link/metrics';
import {
  getNodeCanvasStyle,
  renderNodeCanvasLabel,
} from './nodes/canvas2d';
import type { GraphRuntime } from '../runtime/use/state';
import type { FGLink, FGNode } from '../model/build';
import type { WebviewPluginHost } from '../../../pluginHost/manager';
import type { OwnedGraphNodeStyle } from './surface/owned2d/contracts';
import { NodeLabelSpriteCache } from './node/labelSprite';

export interface UseGraphCallbacksOptions {
  pluginHost?: WebviewPluginHost;
  refs: Pick<
    GraphRuntime,
    | 'directionColorRef'
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
  getLinkColor: (this: void, link: FGLink) => string;
  getLinkOpacity: (this: void, link: FGLink) => number;
  getLinkParticles: (this: void, link: FGLink) => number;
  getLinkWidth: (this: void, link: FGLink) => number;
  getNodeStyle: (this: void, node: FGNode) => OwnedGraphNodeStyle;
  getParticleColor: (this: void, link: FGLink) => string;
  getStyleRevision: (this: void) => number;
  nodeLabelCanvasObject: (this: void, node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => void;
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
    edgeDecorationsRef: refs.edgeDecorationsRef,
    graphAppearanceRef: refs.graphAppearanceRef,
    highlightedNodeRef: refs.highlightedNodeRef,
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
  const labelSpriteCacheRef = useRef<NodeLabelSpriteCache | null>(null);
  if (labelSpriteCacheRef.current === null) {
    labelSpriteCacheRef.current = new NodeLabelSpriteCache();
  }

  contextRef.current = {
    pluginHost,
    refs,
    triggerImageRerender,
  };

  if (callbacksRef.current === null) {
    let styleRevision = 0;
    let styleSnapshotInitialized = false;
    let directionColor: unknown;
    let edgeDecorations: unknown;
    let graphAppearance: unknown;
    let highlightedNeighbors: unknown;
    let highlightedNode: unknown;
    let nodeDecorations: unknown;
    let selectedNodes: unknown;
    callbacksRef.current = {
      getNodeStyle(node) {
        return getNodeCanvasStyle(getNodeCanvasContext(contextRef.current), node);
      },
      getStyleRevision() {
        const current = contextRef.current.refs;
        const changed = !styleSnapshotInitialized
          || directionColor !== current.directionColorRef.current
          || edgeDecorations !== current.edgeDecorationsRef.current
          || graphAppearance !== current.graphAppearanceRef.current
          || highlightedNeighbors !== current.highlightedNeighborsRef.current
          || highlightedNode !== current.highlightedNodeRef.current
          || nodeDecorations !== current.nodeDecorationsRef.current
          || selectedNodes !== current.selectedNodesSetRef.current;
        if (!changed) return styleRevision;
        styleSnapshotInitialized = true;
        directionColor = current.directionColorRef.current;
        edgeDecorations = current.edgeDecorationsRef.current;
        graphAppearance = current.graphAppearanceRef.current;
        highlightedNeighbors = current.highlightedNeighborsRef.current;
        highlightedNode = current.highlightedNodeRef.current;
        nodeDecorations = current.nodeDecorationsRef.current;
        selectedNodes = current.selectedNodesSetRef.current;
        styleRevision += 1;
        return styleRevision;
      },
      nodeLabelCanvasObject(node, ctx, globalScale) {
        renderNodeCanvasLabel(
          getNodeCanvasContext(contextRef.current),
          node,
          ctx,
          globalScale,
          labelSpriteCacheRef.current!,
        );
      },
      getLinkColor(link) {
        return getGraphLinkColor(getLinkRenderingContext(contextRef.current.refs), link);
      },
      getLinkOpacity(link) {
        return getGraphLinkOpacity(getLinkRenderingContext(contextRef.current.refs), link);
      },
      getLinkParticles(link) {
        return getGraphLinkParticles(getLinkRenderingContext(contextRef.current.refs), link);
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
