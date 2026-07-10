import type { MutableRefObject } from 'react';
import type {
  ForceGraphMethods as FG2DMethods,
  LinkObject,
  NodeObject,
} from 'react-force-graph-2d';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { DirectionMode } from '../../../../../../shared/settings/modes';
import type { FGLink, FGNode } from '../../../model/build';
import type { GraphSurfaceSharedProps } from '../sharedProps';

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
  linkCanvasObject: (this: void, link: LinkObject, context: CanvasRenderingContext2D, globalScale: number) => void;
  nodeCanvasObject: (this: void, node: NodeObject, context: CanvasRenderingContext2D, globalScale: number) => void;
  nodePointerAreaPaint: (this: void, node: NodeObject, color: string, context: CanvasRenderingContext2D) => void;
  onRenderFramePost: (this: void, context: CanvasRenderingContext2D, globalScale: number) => void;
  particleSize: number;
  particleSpeed: number;
  physicsPaused?: boolean;
  physicsSettings?: IPhysicsSettings;
  sharedProps: GraphSurfaceSharedProps;
}
