import type {
  GraphQueryRelationshipKindGroup,
  GraphQueryRelationshipReportItem,
  GraphQueryRelationshipSymbol,
} from '../model';
import { sortItems } from '../sort';
import type { RelationshipEvidence } from './model';

function evidenceGroupKey(evidence: RelationshipEvidence): string {
  return `${evidence.from}\u0000${evidence.to}`;
}

function relationshipGroupKey(evidence: RelationshipEvidence): string {
  return `${evidence.edgeType}\u0000${evidence.provenance?.pluginId ?? ''}\u0000${evidence.provenance?.sourceId ?? ''}`;
}

function symbolKey(symbol: GraphQueryRelationshipSymbol): string {
  return `${symbol.name}\u0000${symbol.kind ?? ''}\u0000${symbol.range?.startLine ?? ''}\u0000${symbol.range?.endLine ?? ''}`;
}

function appendSymbol(
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
      relationshipsByKey = new Map();
      relationshipIndexes.set(groupKey, relationshipsByKey);
    }

    const relationshipKey = relationshipGroupKey(evidence);
    let relationship = relationshipsByKey?.get(relationshipKey);
    if (!relationship) {
      relationship = {
        edgeType: evidence.edgeType,
        ...(evidence.provenance ? { provenance: evidence.provenance } : {}),
        symbols: [],
      };
      group.relationships.push(relationship);
      relationshipsByKey?.set(relationshipKey, relationship);
    }

    appendSymbol(relationship, evidence.symbol);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    relationships: sortItems(
      group.relationships,
      undefined,
      [{ by: 'edgeType', direction: 'asc' }],
      (item, field) => field === 'edgeType' ? item.edgeType : '',
    ),
  }));
}
