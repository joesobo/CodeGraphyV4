import type {
  GraphQueryRelationshipKindGroup,
  GraphQueryRelationshipReportItem,
} from '../model';
import type { RelationshipEvidence } from './model';
import { evidenceGroupKey, relationshipGroupKey } from './groupKeys';
import { appendUniqueSymbol } from './groupSymbols';

export function groupRelationshipEvidence(evidenceItems: readonly RelationshipEvidence[]): GraphQueryRelationshipReportItem[] {
  const groups = new Map<string, GraphQueryRelationshipReportItem>();
  const relationshipIndexes = new Map<string, Map<string, GraphQueryRelationshipKindGroup>>();

  for (const evidence of evidenceItems) {
    const groupKey = evidenceGroupKey(evidence);
    let group = groups.get(groupKey);
    let relationshipsByKey = relationshipIndexes.get(groupKey);

    if (!group) {
      group = {
        from: evidence.from,
        to: evidence.to,
        relationships: [],
      };
      groups.set(groupKey, group);
    }

    if (!relationshipsByKey) {
      relationshipsByKey = new Map();
      relationshipIndexes.set(groupKey, relationshipsByKey);
    }

    const relationshipKey = relationshipGroupKey(evidence);
    let relationship = relationshipsByKey.get(relationshipKey);
    if (!relationship) {
      relationship = {
        edgeType: evidence.edgeType,
        ...(evidence.provenance ? { provenance: evidence.provenance } : {}),
        symbols: [],
      };
      group.relationships.push(relationship);
      relationshipsByKey.set(relationshipKey, relationship);
    }

    appendUniqueSymbol(relationship, evidence.symbol);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    relationships: [...group.relationships].sort((left, right) => left.edgeType.localeCompare(right.edgeType)),
  }));
}
