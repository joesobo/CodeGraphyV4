import type { PathResolver } from './PathResolver';

/** Context provided by the TypeScript plugin orchestrator to each rule */
export interface TsRuleContext {
  resolver: PathResolver;
}
