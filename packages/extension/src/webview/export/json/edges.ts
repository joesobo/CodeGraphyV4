import type { IGraphData } from '../../../shared/graph/contracts';
import type { IGroup } from '../../../shared/settings/groups';
import { globMatch } from '../../globMatch';

function getEdgeLegendIds(edge: IGraphData['edges'][number], activeLegendRules: IGroup[]): string[] {
  return activeLegendRules
    .filter((group) => group.target !== 'node')
    .filter((group) =>
      globMatch(edge.id, group.pattern)
      || globMatch(edge.kind, group.pattern)
      || globMatch(`${edge.from}->${edge.to}`, group.pattern)
      || globMatch(`${edge.from}->${edge.to}#${edge.kind}`, group.pattern),
    )
    .map((group) => group.id);
}

export function buildExportEdges(
  graphData: IGraphData,
  activeLegendRules: IGroup[],
  pluginNames: ReadonlyMap<string, string>,
) {
  return [...graphData.edges]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      kind: edge.kind,
      color: edge.color,
      legendIds: getEdgeLegendIds(edge, activeLegendRules),
      sources: [...edge.sources]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((source) => ({
          id: source.id,
          pluginId: source.pluginId,
          pluginName: pluginNames.get(source.pluginId),
          sourceId: source.sourceId,
          label: source.label,
          variant: source.variant,
          metadata: source.metadata,
        })),
    }));
}
