import type { IGroup } from '../../shared/settings/groups';

interface EdgeTypeColorDefinition {
  defaultColor: string;
  id: string;
}

export function ruleTargetsEdges(rule: IGroup): boolean {
  return (rule.target ?? 'node') !== 'node';
}

export function createEdgeTypeIdSet(edgeTypes: Array<{ id: string }>): Set<string> {
  return new Set(edgeTypes.map((edgeType) => edgeType.id));
}

export function isEdgeTypeColorRule(rule: IGroup, edgeTypeIds: ReadonlySet<string>): boolean {
  return !rule.isPluginDefault && ruleTargetsEdges(rule) && edgeTypeIds.has(rule.pattern);
}

export function resolveEdgeTypeColorOverrides(
  rules: IGroup[],
  edgeTypeIds: ReadonlySet<string>,
): Record<string, string> {
  const colors: Record<string, string> = {};

  for (const rule of [...rules].filter((entry) => !entry.disabled).reverse()) {
    if (isEdgeTypeColorRule(rule, edgeTypeIds)) {
      colors[rule.pattern] = rule.color;
    }
  }

  return colors;
}

export function resolveEdgeTypeColors(
  edgeTypes: EdgeTypeColorDefinition[],
  legends: IGroup[],
): Record<string, string> {
  const edgeTypeIds = createEdgeTypeIdSet(edgeTypes);
  const overrides = resolveEdgeTypeColorOverrides(
    legends.filter((rule) => !rule.isPluginDefault),
    edgeTypeIds,
  );

  return Object.fromEntries(
    edgeTypes.map((edgeType) => [
      edgeType.id,
      overrides[edgeType.id] ?? edgeType.defaultColor,
    ]),
  );
}
