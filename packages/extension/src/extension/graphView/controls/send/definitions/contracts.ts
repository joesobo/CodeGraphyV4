export interface GraphNodeTypeLike {
  id: string;
  label: string;
  defaultColor: string;
  defaultVisible: boolean;
  description?: GraphTypeDescriptionLike;
}

export interface GraphEdgeTypeLike {
  id: string;
  label: string;
  defaultColor: string;
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
