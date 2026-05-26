import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { SymbolDefaultGroup } from './model';

export function symbolKindMatchesGroup(
  group: SymbolDefaultGroup,
  symbol: NonNullable<IGraphData['nodes'][number]['symbol']>,
): boolean {
  if (group.matchSymbolKind && group.matchSymbolKind !== symbol.kind) {
    return false;
  }

  if (group.matchSymbolKinds && !group.matchSymbolKinds.includes(symbol.kind)) {
    return false;
  }

  return true;
}
