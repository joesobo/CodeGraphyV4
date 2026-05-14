import type { GraphQueryRelationshipSymbol } from '../model';
import type { RelationshipEvidence } from './model';

export function evidenceGroupKey(evidence: RelationshipEvidence): string {
  return `${evidence.from}\u0000${evidence.to}`;
}

export function relationshipGroupKey(evidence: RelationshipEvidence): string {
  return `${evidence.edgeType}\u0000${evidence.provenance?.pluginId ?? ''}\u0000${evidence.provenance?.sourceId ?? ''}`;
}

export function symbolKey(symbol: GraphQueryRelationshipSymbol): string {
  return `${symbol.name}\u0000${symbol.kind ?? ''}\u0000${symbol.range?.startLine ?? ''}\u0000${symbol.range?.endLine ?? ''}`;
}
