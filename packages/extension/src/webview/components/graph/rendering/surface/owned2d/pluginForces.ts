import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { IGraphViewForceAdapter } from '@codegraphy-dev/plugin-api';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { GraphEdgeKind, IGraphData } from '../../../../../../shared/graph/contracts';
import type { FGLink, FGNode } from '../../../model/build';

interface InstalledForceAdapter {
  adapter: IGraphViewForceAdapter;
  contribution: CoreGraphViewContributionSet['forces'][number]['contribution'];
  contextSignature: string;
  nodes: readonly FGNode[];
}

export interface OwnedGraphPluginForces {
  active(): boolean;
  sync(
    contributions: CoreGraphViewContributionSet | undefined,
    graphData: { nodes: FGNode[]; links: FGLink[] },
    physicsSettings?: IPhysicsSettings,
  ): boolean;
  tick(alpha?: number): void;
  dispose(): void;
}

function namespace(pluginId: string, contributionId: string): string {
  return `plugin:${pluginId}:${contributionId}`;
}

function contextSignature(settings?: IPhysicsSettings): string {
  return [
    settings?.repelForce ?? '',
    settings?.linkDistance ?? '',
    settings?.linkForce ?? '',
    settings?.damping ?? '',
    settings?.centerForce ?? '',
  ].join(':');
}

function visibleGraph(graphData: { nodes: FGNode[]; links: FGLink[] }): IGraphData {
  return {
    nodes: graphData.nodes,
    edges: graphData.links.map(link => ({
      id: link.id,
      from: link.from,
      to: link.to,
      kind: (link.kind ?? 'reference') as GraphEdgeKind,
      metadata: link.metadata,
      sources: [],
    })),
  };
}

type ForceContribution = CoreGraphViewContributionSet['forces'][number];

class ActiveOwnedGraphPluginForces implements OwnedGraphPluginForces {
  private readonly installed = new Map<string, InstalledForceAdapter>();

  active(): boolean {
    return this.installed.size > 0;
  }

  sync(
    contributions: CoreGraphViewContributionSet | undefined,
    graphData: { nodes: FGNode[]; links: FGLink[] },
    physicsSettings?: IPhysicsSettings,
  ): boolean {
    const active = new Set<string>();
    const signature = contextSignature(physicsSettings);
    const graph = visibleGraph(graphData);
    let changed = false;
    for (const entry of contributions?.forces ?? []) {
      const key = namespace(entry.pluginId, entry.contribution.id);
      active.add(key);
      changed = this.syncContribution(
        key,
        entry,
        graphData.nodes,
        graph,
        signature,
        physicsSettings,
      ) || changed;
    }
    return this.removeInactive(active) || changed;
  }

  tick(alpha?: number): void {
    for (const current of this.installed.values()) current.adapter.tick?.(alpha);
  }

  dispose(): void {
    for (const current of this.installed.values()) current.adapter.dispose();
    this.installed.clear();
  }

  private removeInactive(active: ReadonlySet<string>): boolean {
    let changed = false;
    for (const [key, current] of this.installed) {
      if (active.has(key)) continue;
      current.adapter.dispose();
      this.installed.delete(key);
      changed = true;
    }
    return changed;
  }

  private reusable(
    current: InstalledForceAdapter | undefined,
    entry: ForceContribution,
    nodes: readonly FGNode[],
    signature: string,
  ): boolean {
    return current?.contribution === entry.contribution
      && current.nodes === nodes
      && current.contextSignature === signature;
  }

  private syncContribution(
    key: string,
    entry: ForceContribution,
    nodes: FGNode[],
    graph: IGraphData,
    signature: string,
    physicsSettings: IPhysicsSettings | undefined,
  ): boolean {
    const current = this.installed.get(key);
    if (this.reusable(current, entry, nodes, signature)) return false;
    current?.adapter.dispose();
    const adapter = entry.contribution.create({
      nodes,
      edges: graph.edges,
      visibleGraph: graph,
      physicsSettings,
    });
    adapter.initialize?.(nodes);
    this.installed.set(key, {
      adapter,
      contribution: entry.contribution,
      contextSignature: signature,
      nodes,
    });
    return true;
  }
}

export function createOwnedGraphPluginForces(): OwnedGraphPluginForces {
  return new ActiveOwnedGraphPluginForces();
}
