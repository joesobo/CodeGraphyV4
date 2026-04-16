import { CORE_GRAPH_EDGE_TYPES, CORE_GRAPH_NODE_TYPES } from './definitions';

function mapDefaults<TValue>(
  definitions: Array<{ id: string; defaultVisible?: boolean; defaultColor?: string }>,
  key: 'defaultVisible' | 'defaultColor',
): Record<string, TValue> {
  return Object.fromEntries(
    definitions.map((definition) => [definition.id, definition[key]]),
  ) as Record<string, TValue>;
}

export function createDefaultNodeVisibility(): Record<string, boolean> {
  return mapDefaults<boolean>(CORE_GRAPH_NODE_TYPES, 'defaultVisible');
}

export function createDefaultNodeColors(): Record<string, string> {
  return mapDefaults<string>(CORE_GRAPH_NODE_TYPES, 'defaultColor');
}

export function createDefaultEdgeVisibility(): Record<string, boolean> {
  return mapDefaults<boolean>(CORE_GRAPH_EDGE_TYPES, 'defaultVisible');
}

export function createDefaultEdgeColors(): Record<string, string> {
  return mapDefaults<string>(CORE_GRAPH_EDGE_TYPES, 'defaultColor');
}
