import { applyReportFilters } from './filter';
import type { GraphQueryData } from './data';
import type {
  GraphQueryConnectionConfig,
  GraphQueryRelationshipReport,
} from './model';
import { paginate } from './pagination';
import { sortItems } from './sort';
import { createRelationEvidence, createStructuralEvidence } from './relationships/evidence';
import { groupRelationshipEvidence } from './relationships/group';
import { createSymbolMap } from './relationships/symbols';
import { readRelationshipReportValue } from './relationships/values';
import { applyDomainConnectionFilters, createVisibleEdgeSet } from './relationships/visibility';

export function listGraphRelationships(
  data: GraphQueryData,
  config: GraphQueryConnectionConfig = {},
): GraphQueryRelationshipReport {
  const visibleEdgeKeys = createVisibleEdgeSet(data, config);
  const symbolById = createSymbolMap(data.symbols);
  const evidenceItems = [
    ...createRelationEvidence(data.relations, symbolById, visibleEdgeKeys),
    ...createStructuralEvidence(data, config, visibleEdgeKeys),
  ];
  const filteredEvidence = applyDomainConnectionFilters(
    evidenceItems.map((item) => ({ ...item, kind: item.edgeType })),
    config,
  );
  const groupedRelationships = groupRelationshipEvidence(filteredEvidence);
  const filteredRelationships = applyReportFilters(
    groupedRelationships,
    config.filters,
    readRelationshipReportValue,
  );
  const sortedRelationships = sortItems(
    filteredRelationships,
    config.sort,
    [
      { by: 'from', direction: 'asc' },
      { by: 'to', direction: 'asc' },
    ],
    readRelationshipReportValue,
  );
  const page = paginate(sortedRelationships, config);

  return {
    relationships: page.items,
    page: page.page,
  };
}
