import type {
  GraphDefinitionReader,
  GraphEdgeTypeLike,
  GraphNodeTypeLike,
  GraphScopeCapabilitiesLike,
} from './contracts';
import { isGraphEdgeTypeLike } from './edgeGuard';
import { isGraphNodeTypeLike } from './nodeGuard';

export function readRegistryDefinitions<TDefinition>(
  registry: unknown,
  methodName: 'listNodeTypes' | 'listEdgeTypes',
  isDefinition: GraphDefinitionReader<TDefinition>,
  disabledPlugins: ReadonlySet<string> = new Set(),
): TDefinition[] {
  if (!registry || typeof registry !== 'object') {
    return [];
  }

  const candidate = (registry as Record<string, unknown>)[methodName];
  if (typeof candidate !== 'function') {
    return [];
  }

  const definitions: unknown = Reflect.apply(candidate, registry, [disabledPlugins]);
  if (!Array.isArray(definitions)) {
    return [];
  }

  return definitions.filter(isDefinition);
}

export function readNodeTypes(
  registry: unknown,
  disabledPlugins: ReadonlySet<string> = new Set(),
): GraphNodeTypeLike[] {
  return readRegistryDefinitions(registry, 'listNodeTypes', isGraphNodeTypeLike, disabledPlugins);
}

export function readEdgeTypes(
  registry: unknown,
  disabledPlugins: ReadonlySet<string> = new Set(),
): GraphEdgeTypeLike[] {
  return readRegistryDefinitions(registry, 'listEdgeTypes', isGraphEdgeTypeLike, disabledPlugins);
}

function isGraphScopeCapabilitiesLike(value: unknown): value is GraphScopeCapabilitiesLike {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.nodeTypes)
    && candidate.nodeTypes.every((nodeType) => typeof nodeType === 'string')
    && Array.isArray(candidate.edgeTypes)
    && candidate.edgeTypes.every((edgeType) => typeof edgeType === 'string');
}

export function readGraphScopeCapabilities(
  registry: unknown,
  filePaths: readonly string[],
  disabledPlugins: ReadonlySet<string> = new Set(),
): GraphScopeCapabilitiesLike {
  if (!registry || typeof registry !== 'object') {
    return { nodeTypes: [], edgeTypes: [] };
  }

  const candidate = (registry as Record<string, unknown>).listGraphScopeCapabilities;
  if (typeof candidate !== 'function') {
    return { nodeTypes: [], edgeTypes: [] };
  }

  const capabilities: unknown = Reflect.apply(candidate, registry, [filePaths, disabledPlugins]);
  if (!isGraphScopeCapabilitiesLike(capabilities)) {
    return { nodeTypes: [], edgeTypes: [] };
  }

  return capabilities;
}
