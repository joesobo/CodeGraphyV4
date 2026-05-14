import type { GraphEdgeKind } from '../../graph/contracts';
import type {
  GraphQueryRelationshipProvenance,
  GraphQueryRelationshipSymbol,
} from '../model';

export interface RelationshipEvidence {
  from: string;
  to: string;
  edgeType: GraphEdgeKind;
  provenance?: GraphQueryRelationshipProvenance;
  symbol?: GraphQueryRelationshipSymbol;
}
