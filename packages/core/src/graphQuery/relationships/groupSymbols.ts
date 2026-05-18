import type {
  GraphQueryRelationshipKindGroup,
  GraphQueryRelationshipSymbol,
} from '../model';
import { symbolKey } from './groupKeys';

export function appendUniqueSymbol(
  relationship: GraphQueryRelationshipKindGroup,
  symbol: GraphQueryRelationshipSymbol | undefined,
): void {
  if (!symbol) {
    return;
  }

  if (!relationship.symbols.some((item) => symbolKey(item) === symbolKey(symbol))) {
    relationship.symbols.push(symbol);
  }
}
