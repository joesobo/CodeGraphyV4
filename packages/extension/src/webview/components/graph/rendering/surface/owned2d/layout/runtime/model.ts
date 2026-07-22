import { createGraphLayoutEngine, type GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import type { IPhysicsSettings } from '../../../../../../../../shared/settings/physics';
import type { FGLink, FGNode } from '../../../../../model/build';
import { buildOwnedGraphLayoutData } from './data';
import { toOwnedPhysicsConfig } from './settings';

export interface OwnedGraphLayout {
  baseStyleRevision: number;
  engine: GraphLayoutEngine;
  links: FGLink[];
  membershipRevision: number;
  nodes: FGNode[];
}

export { applyOwnedPhysicsSettings, toOwnedPhysicsConfig } from './settings';
export { syncOwnedLayoutNodes, syncOwnedLayoutNodesAtVersion, updateOwnedGraphLayout } from './update';

export function createOwnedGraphLayout(nodes: FGNode[], links: FGLink[], settings: IPhysicsSettings): OwnedGraphLayout {
  const data = buildOwnedGraphLayoutData(nodes, links);
  return {
    baseStyleRevision: 0,
    engine: createGraphLayoutEngine(data.input, toOwnedPhysicsConfig(settings)),
    links: data.resolvedLinks,
    membershipRevision: 0,
    nodes,
  };
}
