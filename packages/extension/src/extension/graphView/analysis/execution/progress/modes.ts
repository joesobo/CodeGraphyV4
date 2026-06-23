import type { GraphViewAnalysisMode } from '../../execution';

export function supportsInitialProgress(mode: GraphViewAnalysisMode): boolean {
  return mode === 'index' || mode === 'refresh' || mode === 'incremental';
}
