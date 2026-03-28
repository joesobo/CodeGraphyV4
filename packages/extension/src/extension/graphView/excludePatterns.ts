import { addGraphViewExcludePatterns } from './files/actions';

interface AddGraphViewExcludePatternsWithUndoOptions<TAction> {
  createAction: (
    patterns: string[],
    analyzeAndSendData: () => Promise<void>,
  ) => TAction;
  executeAction: (action: TAction) => Promise<void>;
  analyzeAndSendData: () => Promise<void>;
}

export async function addGraphViewExcludePatternsWithUndo<TAction>(
  patterns: string[],
  {
    createAction,
    executeAction,
    analyzeAndSendData,
  }: AddGraphViewExcludePatternsWithUndoOptions<TAction>,
): Promise<void> {
  await addGraphViewExcludePatterns(patterns, {
    executeAddToExcludeAction: async nextPatterns => {
      const action = createAction(nextPatterns, analyzeAndSendData);
      await executeAction(action);
    },
  });
}
