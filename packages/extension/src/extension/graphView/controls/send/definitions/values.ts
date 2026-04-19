import type {
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
} from '../../../../../shared/graphControls/contracts';
import { normalizeHexColor } from '../../../../../shared/fileColors';
import type { IGroup } from '../../../../../shared/settings/groups';

export function resolveVisibilityMap<TDefinition extends { id: string; defaultVisible: boolean }>(
  definitions: TDefinition[],
  configured: Record<string, unknown>,
): Record<string, boolean> {
  const visibility: Record<string, boolean> = {};

  for (const definition of definitions) {
    visibility[definition.id] =
      typeof configured[definition.id] === 'boolean'
        ? (configured[definition.id] as boolean)
        : definition.defaultVisible;
  }

  return visibility;
}

export function resolveNodeColors(
  definitions: IGraphNodeTypeDefinition[],
  configured: Record<string, unknown>,
): Record<string, string> {
  const colors: Record<string, string> = {};

  for (const definition of definitions) {
    const configuredColor =
      typeof configured[definition.id] === 'string'
        ? (configured[definition.id] as string)
        : undefined;
    colors[definition.id] = normalizeHexColor(configuredColor, definition.defaultColor);
  }

  return colors;
}

export function resolveEdgeColors(
  definitions: IGraphEdgeTypeDefinition[],
  configured: Record<string, unknown>,
): Record<string, string> {
  const colors: Record<string, string> = {};

  for (const definition of definitions) {
    const configuredColor =
      typeof configured[definition.id] === 'string'
        ? (configured[definition.id] as string)
        : undefined;
    colors[definition.id] = normalizeHexColor(configuredColor, definition.defaultColor);
  }

  return colors;
}

function ruleTargetsEdges(rule: IGroup): boolean {
  return (rule.target ?? 'node') !== 'node';
}

export function readLegendEdgeColorOverrides(legends: IGroup[]): Record<string, string> {
  const colors: Record<string, string> = {};

  for (const rule of [...legends].filter(rule => !rule.disabled).reverse()) {
    if (
      !ruleTargetsEdges(rule)
      || typeof rule.pattern !== 'string'
      || typeof rule.color !== 'string'
    ) {
      continue;
    }

    colors[rule.pattern] = rule.color;
  }

  return colors;
}
