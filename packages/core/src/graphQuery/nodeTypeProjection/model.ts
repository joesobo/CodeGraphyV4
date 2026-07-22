import { DEFAULT_FILE_NODE_TYPE } from '../../visibleGraph/model';

export interface GraphQueryNodeTypeProjectionInput {
  scopeTypes?: Readonly<Record<string, boolean>>;
  projectedNodeTypes?: readonly string[];
}

export function resolveGraphQueryNodeTypes(
  input: GraphQueryNodeTypeProjectionInput,
): Set<string> {
  if (input.projectedNodeTypes) return new Set(input.projectedNodeTypes);
  const scopeTypes = input.scopeTypes ?? {};
  const enabledTypes = Object.entries(scopeTypes)
    .filter(([, enabled]) => enabled)
    .map(([type]) => type);
  return new Set(Object.keys(scopeTypes).length > 0 ? enabledTypes : [DEFAULT_FILE_NODE_TYPE]);
}
