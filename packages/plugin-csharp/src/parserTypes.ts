import type { PathResolver } from './PathResolver';

export interface IDetectedUsing {
  namespace: string;
  alias?: string;
  isStatic: boolean;
  isGlobal: boolean;
  line: number;
  usedTypes?: string[];
}

export interface IDetectedNamespace {
  name: string;
  line: number;
  isFileScoped: boolean;
}

export interface CSharpRuleContext {
  resolver: PathResolver;
  usings: IDetectedUsing[];
  namespaces: IDetectedNamespace[];
  usedTypes: Set<string>;
}
