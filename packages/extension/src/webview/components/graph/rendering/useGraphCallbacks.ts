import { useRef } from 'react';
import type { GraphRuntime } from '../runtime/use/state';
import type { FGLink, FGNode } from '../model/build';
import type { WebviewPluginHost } from '../../../pluginHost/manager';
import type { OwnedGraphNodeStyle } from './surface/owned2d/contracts';
import { NodeLabelSpriteCache } from './node/labelSprite';
import { createGraphCallbacks } from './graphCallbacks';

export interface UseGraphCallbacksOptions {
  pluginHost?: WebviewPluginHost;
  refs: Pick<
    GraphRuntime,
    | 'edgeDecorationsRef'
    | 'graphAppearanceRef'
    | 'highlightedNeighborsRef'
    | 'highlightedNodeRef'
    | 'nodeDecorationsRef'
    | 'showLabelsRef'
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

type GraphCallbackContext = GraphCallbackRefs & {
  pluginHost?: WebviewPluginHost;
  triggerImageRerender(this: void): void;
};

export function useGraphCallbacks({
  pluginHost,
  refs,
  triggerImageRerender,
}: UseGraphCallbacksOptions): UseGraphCallbacksResult {
  const contextRef = useRef<GraphCallbackContext>({
    ...refs,
    pluginHost,
    triggerImageRerender,
  });
  const callbacksRef = useRef<UseGraphCallbacksResult | null>(null);
  const labelSpriteCacheRef = useRef<NodeLabelSpriteCache | null>(null);
  if (labelSpriteCacheRef.current === null) {
    labelSpriteCacheRef.current = new NodeLabelSpriteCache();
  }

  contextRef.current = {
    ...refs,
    pluginHost,
    triggerImageRerender,
  };

  if (callbacksRef.current === null) {
    callbacksRef.current = createGraphCallbacks(contextRef, labelSpriteCacheRef.current);
  }

  return callbacksRef.current;
}

export type { GraphCallbackContext };
