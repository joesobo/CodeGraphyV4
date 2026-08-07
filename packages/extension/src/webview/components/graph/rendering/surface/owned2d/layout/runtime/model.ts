import { createGraphLayoutEngine, type GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import {
  toGraphPhysicsLayoutConfig,
  type GraphPhysicsSettings,
} from '@codegraphy-dev/graph-renderer/visuals';
import type { FGLink, FGNode } from '../../../../../model/build';
import { buildOwnedGraphLayoutData } from './data';

export interface OwnedGraphLayout {
  baseStyleRevision: number;
  engine: GraphLayoutEngine;
  links: FGLink[];
  membershipRevision: number;
  nodes: FGNode[];
}

export { syncOwnedLayoutNodes, syncOwnedLayoutNodesAtVersion, updateOwnedGraphLayout } from './update';

export function createOwnedGraphLayout(nodes: FGNode[], links: FGLink[], settings: GraphPhysicsSettings): OwnedGraphLayout {
  const data = buildOwnedGraphLayoutData(nodes, links);
  return {
    baseStyleRevision: 0,
    engine: createGraphLayoutEngine(data.input, toGraphPhysicsLayoutConfig(settings)),
    links: data.resolvedLinks,
    membershipRevision: 0,
    nodes,
  };
}
