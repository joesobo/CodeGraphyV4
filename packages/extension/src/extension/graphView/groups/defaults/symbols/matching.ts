import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { SymbolDefaultGroup } from './model';
import { nodeTypeMatchesGroup } from './nodeType';
import { pluginMetadataMatchesGroup } from './pluginMetadata';
import { symbolKindMatchesGroup } from './symbolKind';

export function symbolGroupMatchesNode(
  group: SymbolDefaultGroup,
  node: IGraphData['nodes'][number],
): boolean {
  const symbol = node.symbol;
  if (!symbol) {
    return false;
  }

  return nodeTypeMatchesGroup(group, node)
    && symbolKindMatchesGroup(group, symbol)
    && pluginMetadataMatchesGroup(group, symbol);
}
