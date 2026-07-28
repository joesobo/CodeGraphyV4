import { addGraphViewExcludePatterns } from './files/actions';

interface AddGraphViewExcludePatternsWithUndoOptions<TAction> {
  createAction: (
    patterns: string[],
    reloadCachedGraph: () => Promise<void>,
  ) => TAction;
  executeAction: (action: TAction) => Promise<void>;
  reloadCachedGraph: () => Promise<void>;
}

export async function addGraphViewExcludePatternsWithUndo<TAction>(
  patterns: string[],
  {
    createAction,
    executeAction,
    reloadCachedGraph,
  }: AddGraphViewExcludePatternsWithUndoOptions<TAction>,
): Promise<void> {
  await addGraphViewExcludePatterns(patterns, {
    executeAddToExcludeAction: async nextPatterns => {
      const action = createAction(nextPatterns, reloadCachedGraph);
      await executeAction(action);
    },
  });
}
