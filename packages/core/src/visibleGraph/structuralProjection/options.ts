import type { VisibleGraphScopeConfig } from '../contracts';
import {
  FOLDER_NODE_TYPE,
  getDisabledTypes,
  getEnabledTypes,
  PACKAGE_NODE_TYPE,
  STRUCTURAL_NESTS_EDGE_KIND,
} from '../model';

export interface StructuralProjectionOptions {
  folderEnabled: boolean;
  packageEnabled: boolean;
  nestsEnabled: boolean;
}

export function resolveStructuralProjectionOptions(
  scope?: VisibleGraphScopeConfig,
): StructuralProjectionOptions {
  const enabledNodeTypes = scope?.nodes ? getEnabledTypes(scope.nodes) : new Set<string>();
  const enabledEdgeTypes = scope?.edges ? getEnabledTypes(scope.edges) : new Set<string>();
  const disabledEdgeTypes = scope?.edges ? getDisabledTypes(scope.edges) : new Set<string>();
  const hasNestsScope = enabledEdgeTypes.has(STRUCTURAL_NESTS_EDGE_KIND)
    || disabledEdgeTypes.has(STRUCTURAL_NESTS_EDGE_KIND);

  return {
    folderEnabled: enabledNodeTypes.has(FOLDER_NODE_TYPE),
    packageEnabled: enabledNodeTypes.has(PACKAGE_NODE_TYPE),
    nestsEnabled: hasNestsScope ? enabledEdgeTypes.has(STRUCTURAL_NESTS_EDGE_KIND) : true,
  };
}

export function hasStructuralNodeProjection(options: StructuralProjectionOptions): boolean {
  return options.folderEnabled || options.packageEnabled;
}
