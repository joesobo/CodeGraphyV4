import type { GraphQueryRelationshipReportItem } from '../model';

export function readRelationshipReportValue(
  item: GraphQueryRelationshipReportItem,
  field: string,
): string | readonly string[] {
  switch (field) {
    case 'from':
      return item.from;
    case 'to':
      return item.to;
    case 'edgeType':
    case 'edgeTypes':
      return item.relationships.map((relationship) => relationship.edgeType);
    default:
      return '';
  }
}
