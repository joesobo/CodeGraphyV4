import { createGraphLayoutEngine, type GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { FGLink, FGNode } from '../../../model/build';
import { buildOwnedGraphLayoutData } from './layoutData';
import { toOwnedPhysicsConfig } from './layoutSettings';

export interface OwnedGraphLayout { engine: GraphLayoutEngine; links: FGLink[]; nodes: FGNode[] }

export { applyOwnedPhysicsSettings, toOwnedPhysicsConfig } from './layoutSettings';
export { syncOwnedLayoutNodes, syncOwnedLayoutNodesAtVersion, updateOwnedGraphLayout } from './layoutUpdate';

export function createOwnedGraphLayout(nodes: FGNode[], links: FGLink[], settings: IPhysicsSettings): OwnedGraphLayout {
  const data = buildOwnedGraphLayoutData(nodes, links);
  return {
    engine: createGraphLayoutEngine(data.input, toOwnedPhysicsConfig(settings)),
    links: data.resolvedLinks,
    nodes,
  };
}
