import type { MutableRefObject, ReactElement } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import type {
  ForceGraphMethods as FG3DMethods,
} from 'react-force-graph-3d';
import type { DirectionMode } from '../../../../shared/contracts';
import type { LinkObject, NodeObject } from 'react-force-graph-2d';
import * as THREE from 'three';
import { DEFAULT_NODE_SIZE, type FGLink, type FGNode } from '../../graphModel';
import type { GraphSurfaceSharedProps } from './sharedProps';

type ForceGraph3DRefObject = MutableRefObject<FG3DMethods<NodeObject, LinkObject> | undefined>;

export interface Surface3dProps {
  backgroundColor: string;
  directionMode: DirectionMode;
  fg3dRef: MutableRefObject<FG3DMethods<FGNode, FGLink> | undefined>;
  getArrowColor: (this: void, link: LinkObject) => string;
  getLinkColor: (this: void, link: LinkObject) => string;
  getLinkParticles: (this: void, link: LinkObject) => number;
  getLinkWidth: (this: void, link: LinkObject) => number;
  getParticleColor: (this: void, link: LinkObject) => string;
  nodeThreeObject: (this: void, node: NodeObject) => THREE.Object3D;
  particleSize: number;
  particleSpeed: number;
  sharedProps: GraphSurfaceSharedProps;
}

export function Surface3d({
  backgroundColor,
  directionMode,
  fg3dRef,
  getArrowColor,
  getLinkColor,
  getLinkParticles,
  getLinkWidth,
  getParticleColor,
  nodeThreeObject,
  particleSize,
  particleSpeed,
  sharedProps,
}: Surface3dProps): ReactElement {
  return (
    <ForceGraph3D
      ref={fg3dRef as unknown as ForceGraph3DRefObject}
      {...sharedProps}
      backgroundColor={backgroundColor}
      nodeVal={(node) => (node as FGNode).size / DEFAULT_NODE_SIZE}
      nodeLabel=""
      nodeThreeObjectExtend={false}
      nodeThreeObject={nodeThreeObject}
      linkColor={getLinkColor}
      linkWidth={getLinkWidth}
      linkDirectionalArrowLength={directionMode === 'arrows' ? 6 : 0}
      linkDirectionalArrowRelPos={1}
      linkDirectionalArrowColor={getArrowColor}
      linkDirectionalParticles={directionMode === 'particles' ? getLinkParticles : 0}
      linkDirectionalParticleWidth={particleSize}
      linkDirectionalParticleSpeed={particleSpeed}
      linkDirectionalParticleColor={getParticleColor}
      linkCurvature={(link) => (link as FGLink).curvature ?? 0}
      linkCurveRotation="rotation"
    />
  );
}
