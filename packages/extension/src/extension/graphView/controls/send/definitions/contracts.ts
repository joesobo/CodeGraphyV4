import type { GraphEdgeKind } from '../../../../../shared/graph/contracts';

export interface GraphNodeTypeLike {
  id: string;
  label: string;
  defaultColor?: string;
  defaultVisible: boolean;
  description?: GraphTypeDescriptionLike;
  parentId?: string;
}

export interface GraphEdgeTypeLike {
  id: string;
  label: string;
  defaultColor?: string;
  defaultVisible: boolean;
  description?: GraphTypeDescriptionLike;
}

export interface GraphTypeExampleLike {
  label?: string;
  code: string;
}

export interface GraphTypeDescriptionLike {
  description: string;
  examples?: GraphTypeExampleLike[];
}

export interface GraphControlsAnalyzerLike {
  registry?: unknown;
}

export interface GraphControlsConfigurationLike {
  get<T>(key: string, defaultValue: T): T;
}

export type GraphDefinitionReader<TDefinition> = (definition: unknown) => definition is TDefinition;

export type GraphNodeTypeCapabilityLike = string;
export type GraphEdgeTypeCapabilityLike = GraphEdgeKind;

export interface GraphScopeCapabilitiesLike {
  nodeTypes: GraphNodeTypeCapabilityLike[];
  edgeTypes: GraphEdgeTypeCapabilityLike[];
}
