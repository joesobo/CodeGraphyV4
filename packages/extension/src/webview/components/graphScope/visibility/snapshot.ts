import type { IGraphControlsSnapshot } from '../../../../shared/graphControls/contracts';
import type { PerfScopeEntry } from '../../../../shared/perf/protocol';

export function getGraphControlsScopeEnabled(
  snapshot: IGraphControlsSnapshot,
  entry: Pick<PerfScopeEntry, 'scopeKind' | 'scopeId'>,
): boolean | undefined {
  const definitions = entry.scopeKind === 'node' ? snapshot.nodeTypes : snapshot.edgeTypes;
  const definition = definitions.find(candidate => candidate.id === entry.scopeId);
  if (!definition) return undefined;
  const visibility = entry.scopeKind === 'node'
    ? snapshot.nodeVisibility
    : snapshot.edgeVisibility;
  return visibility[entry.scopeId] ?? definition.defaultVisible;
}
