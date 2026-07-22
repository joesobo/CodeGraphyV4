import { useRef, type RefObject } from 'react';
import type { GraphRuntime } from '../runtime/use/state';
import type { FGLink, FGNode } from '../model/build';
import type { WebviewPluginHost } from '../../../pluginHost/manager';
import type { OwnedGraphNodeStyle } from './surface/owned2d/view/surface/contracts';
import { NodeLabelSpriteCache } from './node/labelSprite';
import { createGraphCallbacks } from './graphCallbacks';
import { createCssColorResolver, type CssColorResolver } from '../../../cssColors/resolver';

export interface UseGraphCallbacksOptions {
  colorContextRef: RefObject<Element | null>;
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
  getBaseLinkColor: (this: void, link: FGLink) => string;
  getBaseLinkOpacity: (this: void, link: FGLink) => number;
  getBaseLinkWidth: (this: void, link: FGLink) => number;
  getBaseNodeStyle: (this: void, node: FGNode) => OwnedGraphNodeStyle;
  getBaseStyleRevision: (this: void) => number;
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
  resolveColor: CssColorResolver['resolve'];
  triggerImageRerender(this: void): void;
};

export function useGraphCallbacks({
  colorContextRef,
  pluginHost,
  refs,
  triggerImageRerender,
}: UseGraphCallbacksOptions): UseGraphCallbacksResult {
  const callbacksRef = useRef<UseGraphCallbacksResult | null>(null);
  const colorResolverRef = useRef<CssColorResolver | null>(null);
  const labelSpriteCacheRef = useRef<NodeLabelSpriteCache | null>(null);
  if (colorResolverRef.current === null) {
    colorResolverRef.current = createCssColorResolver(
      undefined,
      undefined,
      () => colorContextRef.current,
    );
  }
  if (labelSpriteCacheRef.current === null) {
    labelSpriteCacheRef.current = new NodeLabelSpriteCache();
  }
  const contextRef = useRef<GraphCallbackContext>({
    ...refs,
    pluginHost,
    resolveColor: colorResolverRef.current.resolve,
    triggerImageRerender,
  });

  contextRef.current = {
    ...refs,
    pluginHost,
    resolveColor: colorResolverRef.current.resolve,
    triggerImageRerender,
  };

  if (callbacksRef.current === null) {
    callbacksRef.current = createGraphCallbacks(contextRef, labelSpriteCacheRef.current);
  }

  return callbacksRef.current;
}

export type { GraphCallbackContext };
