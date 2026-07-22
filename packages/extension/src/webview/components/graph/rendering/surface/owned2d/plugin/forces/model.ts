import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { IPhysicsSettings } from '../../../../../../../../shared/settings/physics';
import type { FGLink, FGNode } from '../../../../../model/build';
import {
  disposeInstalledForces,
  removeInactiveForces,
  syncForceContribution,
  tickInstalledForces,
  type InstalledForceAdapters,
} from './adapters';
import { forceContextSignature, forceNamespace, visiblePluginForceGraph } from './context';

export interface OwnedGraphPluginForces {
  active(): boolean;
  sync(contributions: CoreGraphViewContributionSet | undefined, graphData: { nodes: FGNode[]; links: FGLink[] }, physicsSettings?: IPhysicsSettings): boolean;
  tick(alpha?: number): boolean;
  dispose(): void;
}

class ActiveOwnedGraphPluginForces implements OwnedGraphPluginForces {
  private readonly installed: InstalledForceAdapters = new Map();
  active(): boolean { return this.installed.size > 0; }

  sync(contributions: CoreGraphViewContributionSet | undefined, graphData: { nodes: FGNode[]; links: FGLink[] }, settings?: IPhysicsSettings): boolean {
    const active = new Set<string>();
    const signature = forceContextSignature(settings);
    let graph = undefined as ReturnType<typeof visiblePluginForceGraph> | undefined;
    let changed = false;
    for (const entry of contributions?.forces ?? []) {
      const key = forceNamespace(entry.pluginId, entry.contribution.id);
      active.add(key);
      graph ??= visiblePluginForceGraph(graphData);
      changed = syncForceContribution(this.installed, key, entry, graphData, graph, signature, settings) || changed;
    }
    return removeInactiveForces(this.installed, active) || changed;
  }

  tick(alpha?: number): boolean { return tickInstalledForces(this.installed, alpha); }
  dispose(): void { disposeInstalledForces(this.installed); }
}

export function createOwnedGraphPluginForces(): OwnedGraphPluginForces {
  return new ActiveOwnedGraphPluginForces();
}
