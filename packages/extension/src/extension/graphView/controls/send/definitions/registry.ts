import type {
  GraphDefinitionReader,
  GraphEdgeTypeCapabilityLike,
  GraphEdgeTypeLike,
  GraphNodeTypeLike,
} from './contracts';
import { isGraphEdgeTypeLike } from './edgeGuard';
import { isGraphNodeTypeLike } from './nodeGuard';

export function readRegistryDefinitions<TDefinition>(
  registry: unknown,
  methodName: 'listNodeTypes' | 'listEdgeTypes',
  isDefinition: GraphDefinitionReader<TDefinition>,
): TDefinition[] {
  if (!registry || typeof registry !== 'object') {
    return [];
  }

  const candidate = (registry as Record<string, unknown>)[methodName];
  if (typeof candidate !== 'function') {
    return [];
  }

  const definitions: unknown = Reflect.apply(candidate, registry, []);
  if (!Array.isArray(definitions)) {
    return [];
  }

  return definitions.filter(isDefinition);
}

export function readNodeTypes(registry: unknown): GraphNodeTypeLike[] {
  return readRegistryDefinitions(registry, 'listNodeTypes', isGraphNodeTypeLike);
}

export function readEdgeTypes(registry: unknown): GraphEdgeTypeLike[] {
  return readRegistryDefinitions(registry, 'listEdgeTypes', isGraphEdgeTypeLike);
}

export function readEdgeTypeCapabilities(
  registry: unknown,
  filePaths: readonly string[],
): GraphEdgeTypeCapabilityLike[] {
  if (!registry || typeof registry !== 'object') {
    return [];
  }

  const candidate = (registry as Record<string, unknown>).listEdgeTypeCapabilities;
  if (typeof candidate !== 'function') {
    return [];
  }

  const capabilities: unknown = Reflect.apply(candidate, registry, [filePaths]);
  if (!Array.isArray(capabilities)) {
    return [];
  }

  return capabilities.filter((capability): capability is GraphEdgeTypeCapabilityLike =>
    typeof capability === 'string',
  );
}
