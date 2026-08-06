import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import type { GraphPhysicsSettings } from '@codegraphy-dev/graph-visuals';
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
  sync(contributions: ExtensionGraphViewContributionSet | undefined, graphData: { nodes: FGNode[]; links: FGLink[] }, physicsSettings?: GraphPhysicsSettings): boolean;
  tick(alpha?: number): boolean;
  dispose(): void;
}

class ActiveOwnedGraphPluginForces implements OwnedGraphPluginForces {
  private readonly installed: InstalledForceAdapters = new Map();
  active(): boolean { return this.installed.size > 0; }

  sync(contributions: ExtensionGraphViewContributionSet | undefined, graphData: { nodes: FGNode[]; links: FGLink[] }, settings?: GraphPhysicsSettings): boolean {
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
