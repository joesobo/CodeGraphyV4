import { useMemo, type MutableRefObject, type ReactElement } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type {
  ForceGraphMethods as FG2DMethods,
  LinkObject,
  NodeObject,
} from 'react-force-graph-2d';
import type { DirectionMode } from '../../../../../../shared/settings/modes';
import type { FGLink, FGNode } from '../../../model/build';
import type { GraphSurfaceSharedProps } from '../sharedProps';
import {
  DIRECTIONAL_ARROW_LENGTH_2D,
} from '../../link/contracts';
import { getLinkCanvasObjectMode } from '../../link/metrics';
import { createGraphRenderBudget } from '../renderBudget';
import { getGraphNodeValue } from './nodeValue';

type ForceGraph2DRef = MutableRefObject<FG2DMethods<NodeObject, LinkObject> | undefined>;

export interface Surface2dProps {
  backgroundColor: string;
  directionMode: DirectionMode;
  fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
  getArrowColor: (this: void, link: LinkObject) => string;
  getArrowRelPos: (this: void, link: LinkObject) => number;
  getLinkColor: (this: void, link: LinkObject) => string;
  getLinkParticles: (this: void, link: LinkObject) => number;
  getLinkWidth: (this: void, link: LinkObject) => number;
  getParticleColor: (this: void, link: LinkObject) => string;
  linkCanvasObject: (this: void, link: LinkObject, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  nodeCanvasObject: (this: void, node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  nodePointerAreaPaint: (this: void, node: NodeObject, color: string, ctx: CanvasRenderingContext2D) => void;
  onRenderFramePost: (this: void, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  particleSize: number;
  particleSpeed: number;
  sharedProps: GraphSurfaceSharedProps;
}

export function Surface2d({
  backgroundColor,
  directionMode,
  fg2dRef,
  getArrowColor,
  getArrowRelPos,
  getLinkColor,
  getLinkParticles,
  getLinkWidth,
  getParticleColor,
  linkCanvasObject,
  nodeCanvasObject,
  nodePointerAreaPaint,
  onRenderFramePost,
  particleSize,
  particleSpeed,
  sharedProps,
}: Surface2dProps): ReactElement {
  const arrowColor = getArrowColor({} as LinkObject);
  const arrowRelPos = getArrowRelPos({} as LinkObject);
  const renderBudget = useMemo(
    () => createGraphRenderBudget(
      sharedProps.graphData as { nodes: FGNode[]; links: FGLink[] },
    ),
    [sharedProps.graphData],
  );

  return (
    <ForceGraph2D
      ref={fg2dRef as unknown as ForceGraph2DRef}
      {...sharedProps}
      backgroundColor={backgroundColor}
      nodeCanvasObject={nodeCanvasObject}
      nodeCanvasObjectMode={() => 'replace'}
      nodePointerAreaPaint={nodePointerAreaPaint}
      nodeVisibility={renderBudget.nodeVisibility}
      nodeVal={(node: NodeObject) => getGraphNodeValue(node as FGNode)}
      nodeRelSize={1}
      linkColor={getLinkColor}
      linkVisibility={renderBudget.linkVisibility}
      linkWidth={getLinkWidth}
      linkDirectionalArrowLength={directionMode === 'arrows' ? DIRECTIONAL_ARROW_LENGTH_2D : 0}
      linkDirectionalArrowRelPos={arrowRelPos}
      linkDirectionalArrowColor={arrowColor}
      linkDirectionalParticles={directionMode === 'particles' ? getLinkParticles : 0}
      linkDirectionalParticleWidth={particleSize}
      linkDirectionalParticleSpeed={particleSpeed}
      linkDirectionalParticleColor={getParticleColor}
      linkCurvature={(link: LinkObject) => (link as FGLink).curvature ?? 0}
      linkCanvasObject={linkCanvasObject}
      linkCanvasObjectMode={(link: LinkObject) =>
        getLinkCanvasObjectMode(directionMode, link as FGLink)
      }
      onRenderFramePost={onRenderFramePost}
      autoPauseRedraw={directionMode !== 'particles'}
      enablePointerInteraction={renderBudget.enablePointerInteraction}
      enablePanInteraction={false}
    />
  );
}
