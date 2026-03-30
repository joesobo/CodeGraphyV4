import type { MutableRefObject, ReactElement } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type {
  ForceGraphMethods as FG2DMethods,
  LinkObject,
  NodeObject,
} from 'react-force-graph-2d';
import type { DirectionMode } from '../../../../../shared/settings/modes';
import type { FGLink, FGNode } from '../../model/build';
import type { GraphSurfaceSharedProps } from './sharedProps';
import {
  DIRECTIONAL_ARROW_LENGTH_2D,
} from '../link/contracts';
import { getLinkCanvasObjectMode } from '../link/metrics';

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
  return (
    <ForceGraph2D
      ref={fg2dRef as unknown as ForceGraph2DRef}
      {...sharedProps}
      backgroundColor={backgroundColor}
      nodeCanvasObject={nodeCanvasObject}
      nodeCanvasObjectMode={() => 'replace'}
      nodePointerAreaPaint={nodePointerAreaPaint}
      nodeVal={(node: NodeObject) => {
        const radius = (node as FGNode).size ?? 16;
        return Math.max(1, radius * radius);
      }}
      nodeRelSize={1}
      linkColor={getLinkColor}
      linkWidth={getLinkWidth}
      linkDirectionalArrowLength={directionMode === 'arrows' ? DIRECTIONAL_ARROW_LENGTH_2D : 0}
      linkDirectionalArrowRelPos={getArrowRelPos}
      linkDirectionalArrowColor={getArrowColor}
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
      autoPauseRedraw={false}
    />
  );
}
