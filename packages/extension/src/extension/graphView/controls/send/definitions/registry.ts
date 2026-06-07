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

export function readEdgeTypeCapabilities(
  registry: unknown,
  filePaths: readonly string[],
  disabledPlugins: ReadonlySet<string> = new Set(),
): GraphEdgeTypeCapabilityLike[] {
  if (!registry || typeof registry !== 'object') {
    return [];
  }

  const candidate = (registry as Record<string, unknown>).listEdgeTypeCapabilities;
  if (typeof candidate !== 'function') {
    return [];
  }

  const capabilities: unknown = Reflect.apply(candidate, registry, [filePaths, disabledPlugins]);
  if (!Array.isArray(capabilities)) {
    return [];
  }

  return capabilities.filter((capability): capability is GraphEdgeTypeCapabilityLike =>
    typeof capability === 'string',
  );
}
