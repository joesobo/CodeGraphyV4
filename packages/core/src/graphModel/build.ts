import type { IGraphData } from '../graph/contracts';
import type { GraphModelConfig, GraphModelResult } from './contracts';
import { applyCollapseProjection } from './collapse';
import { applyFilterPatterns } from './filter';
import { applyShowOrphans } from './orphans';
import { applySearch } from './search';
import { applyGraphScope } from './scope';
import { applyStructuralProjection } from './structure';

type NonNullGraphModelResult = Omit<GraphModelResult, 'graphData'> & {
  graphData: IGraphData;
};

export function buildGraphModel(
  graphData: IGraphData,
  config?: GraphModelConfig,
): NonNullGraphModelResult;
export function buildGraphModel(
  graphData: null,
  config?: GraphModelConfig,
): GraphModelResult;
export function buildGraphModel(
  graphData: IGraphData | null,
  config?: GraphModelConfig,
): GraphModelResult;
export function buildGraphModel(
  graphData: IGraphData | null,
  config: GraphModelConfig = {},
): GraphModelResult {
  if (!graphData) {
    return {
      graphData: null,
      regexError: null,
    };
  }

  let current = graphData;
  let regexError: string | null = null;

  if (config.scope) {
    current = applyGraphScope(current, config.scope);
  }

  current = applyStructuralProjection(current, config.scope, graphData);

  if (config.filter) {
    current = applyFilterPatterns(current, config.filter);
  }

  if (config.search) {
    const result = applySearch(current, config.search);
    current = result.graphData;
    regexError = result.regexError;
  }

  if (config.showOrphans !== undefined) {
    current = applyShowOrphans(current, config.showOrphans);
  }

  if (config.collapse) {
    current = applyCollapseProjection(current, config.collapse);
  }

  return {
    graphData: current,
    regexError,
  };
}
