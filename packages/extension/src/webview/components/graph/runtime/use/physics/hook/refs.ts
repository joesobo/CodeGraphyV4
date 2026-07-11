import type { MutableRefObject } from 'react';
import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { FGLink, FGNode } from '../../../../model/build';

export interface PhysicsRuntimeRefs {
  fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
}
