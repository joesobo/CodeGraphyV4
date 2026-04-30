import type { IGraphData } from '../graph/contracts';
import type { VisibleGraphConfig, VisibleGraphResult } from './contracts';
import { applyFilterPatterns } from './filter';
import { applyShowOrphans } from './orphans';
import { applySearch } from './search';
import { applyGraphScope } from './scope';
import { applyStructuralProjection } from './structure';

type NonNullVisibleGraphResult = Omit<VisibleGraphResult, 'graphData'> & {
  graphData: IGraphData;
};

export function deriveVisibleGraph(
  graphData: IGraphData,
  config?: VisibleGraphConfig,
): NonNullVisibleGraphResult;
export function deriveVisibleGraph(
  graphData: null,
  config?: VisibleGraphConfig,
): VisibleGraphResult;
export function deriveVisibleGraph(
  graphData: IGraphData | null,
  config?: VisibleGraphConfig,
): VisibleGraphResult;
export function deriveVisibleGraph(
  graphData: IGraphData | null,
  config: VisibleGraphConfig = {},
): VisibleGraphResult {
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

  return {
    graphData: current,
    regexError,
  };
}
