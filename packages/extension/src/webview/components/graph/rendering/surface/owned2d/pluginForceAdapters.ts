import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { IGraphViewForceAdapter } from '@codegraphy-dev/plugin-api';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { IGraphData } from '../../../../../../shared/graph/contracts';
import type { FGLink, FGNode } from '../../../model/build';

type ForceContribution = CoreGraphViewContributionSet['forces'][number];
interface InstalledForce { adapter: IGraphViewForceAdapter; contribution: ForceContribution['contribution']; contextSignature: string; links: readonly FGLink[]; nodes: readonly FGNode[] }
export type InstalledForceAdapters = Map<string, InstalledForce>;

function report(key: string, phase: string, error: unknown): void {
  console.error(`[CodeGraphy] Plugin graph force ${key} ${phase} failed:`, error);
}
function dispose(key: string, adapter: IGraphViewForceAdapter): void {
  try { adapter.dispose(); } catch (error) { report(key, 'dispose', error); }
}

export function removeInactiveForces(installed: InstalledForceAdapters, active: ReadonlySet<string>): boolean {
  let changed = false;
  for (const [key, current] of installed) {
    if (active.has(key)) continue;
    installed.delete(key); dispose(key, current.adapter); changed = true;
  }
  return changed;
}

export function tickInstalledForces(installed: InstalledForceAdapters, alpha?: number): void {
  for (const [key, current] of installed) try { current.adapter.tick?.(alpha); } catch (error) { report(key, 'tick', error); }
}

export function disposeInstalledForces(installed: InstalledForceAdapters): void {
  const entries = [...installed]; installed.clear();
  for (const [key, current] of entries) dispose(key, current.adapter);
}

export function syncForceContribution(
  installed: InstalledForceAdapters, key: string, entry: ForceContribution,
  data: { nodes: FGNode[]; links: FGLink[] }, graph: IGraphData,
  signature: string, settings: IPhysicsSettings | undefined,
): boolean {
  const current = installed.get(key);
  if (current?.contribution === entry.contribution && current.nodes === data.nodes
    && current.links === data.links && current.contextSignature === signature) return false;
  let adapter: IGraphViewForceAdapter | undefined;
  try {
    adapter = entry.contribution.create({ nodes: data.nodes, edges: graph.edges, visibleGraph: graph, physicsSettings: settings });
    adapter.initialize?.(data.nodes);
  } catch (error) {
    if (adapter) dispose(key, adapter);
    report(key, 'setup', error);
    return false;
  }
  installed.set(key, { adapter, contribution: entry.contribution, contextSignature: signature, links: data.links, nodes: data.nodes });
  if (current) dispose(key, current.adapter);
  return true;
}
