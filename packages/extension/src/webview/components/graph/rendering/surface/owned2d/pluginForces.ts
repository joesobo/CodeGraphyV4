import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { IGraphViewForceAdapter } from '@codegraphy-dev/plugin-api';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { GraphEdgeKind, IGraphData } from '../../../../../../shared/graph/contracts';
import type { FGLink, FGNode } from '../../../model/build';

interface InstalledForceAdapter {
  adapter: IGraphViewForceAdapter;
  contribution: CoreGraphViewContributionSet['forces'][number]['contribution'];
  contextSignature: string;
  links: readonly FGLink[];
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

function reportAdapterError(key: string, phase: string, error: unknown): void {
  console.error(`[CodeGraphy] Plugin graph force ${key} ${phase} failed:`, error);
}

function disposeAdapter(key: string, adapter: IGraphViewForceAdapter): void {
  try {
    adapter.dispose();
  } catch (error) {
    reportAdapterError(key, 'dispose', error);
  }
}

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
    let graph: IGraphData | undefined;
    const resolveGraph = (): IGraphData => {
      graph ??= visibleGraph(graphData);
      return graph;
    };
    let changed = false;
    for (const entry of contributions?.forces ?? []) {
      const key = namespace(entry.pluginId, entry.contribution.id);
      active.add(key);
      changed = this.syncContribution(
        key,
        entry,
        graphData.nodes,
        graphData.links,
        resolveGraph,
        signature,
        physicsSettings,
      ) || changed;
    }
    return this.removeInactive(active) || changed;
  }

  tick(alpha?: number): void {
    for (const [key, current] of this.installed) {
      try {
        current.adapter.tick?.(alpha);
      } catch (error) {
        reportAdapterError(key, 'tick', error);
      }
    }
  }

  dispose(): void {
    const installed = [...this.installed];
    this.installed.clear();
    for (const [key, current] of installed) disposeAdapter(key, current.adapter);
  }

  private removeInactive(active: ReadonlySet<string>): boolean {
    let changed = false;
    for (const [key, current] of this.installed) {
      if (active.has(key)) continue;
      this.installed.delete(key);
      disposeAdapter(key, current.adapter);
      changed = true;
    }
    return changed;
  }

  private reusable(
    current: InstalledForceAdapter | undefined,
    entry: ForceContribution,
    nodes: readonly FGNode[],
    links: readonly FGLink[],
    signature: string,
  ): boolean {
    return current?.contribution === entry.contribution
      && current.nodes === nodes
      && current.links === links
      && current.contextSignature === signature;
  }

  private syncContribution(
    key: string,
    entry: ForceContribution,
    nodes: FGNode[],
    links: FGLink[],
    resolveGraph: () => IGraphData,
    signature: string,
    physicsSettings: IPhysicsSettings | undefined,
  ): boolean {
    const current = this.installed.get(key);
    if (this.reusable(current, entry, nodes, links, signature)) return false;
    let adapter: IGraphViewForceAdapter | undefined;
    try {
      const graph = resolveGraph();
      adapter = entry.contribution.create({
        nodes,
        edges: graph.edges,
        visibleGraph: graph,
        physicsSettings,
      });
      adapter.initialize?.(nodes);
    } catch (error) {
      if (adapter) disposeAdapter(key, adapter);
      reportAdapterError(key, 'setup', error);
      return false;
    }
    this.installed.set(key, {
      adapter,
      contribution: entry.contribution,
      contextSignature: signature,
      links,
      nodes,
    });
    if (current) disposeAdapter(key, current.adapter);
    return true;
  }
}

export function createOwnedGraphPluginForces(): OwnedGraphPluginForces {
  return new ActiveOwnedGraphPluginForces();
}
