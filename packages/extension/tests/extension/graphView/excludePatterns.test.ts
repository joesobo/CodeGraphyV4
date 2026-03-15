import { describe, expect, it, vi } from 'vitest';
import { addGraphViewExcludePatternsWithUndo } from '../../../src/extension/graphView/excludePatterns';

describe('graph view exclude-pattern helper', () => {
  it('creates and executes the undoable add-to-exclude action', async () => {
    const createdAction = { id: 'exclude-action' };
    const createAction = vi.fn(() => createdAction);
    const executeAction = vi.fn(() => Promise.resolve());
    const analyzeAndSendData = vi.fn(() => Promise.resolve());

    await addGraphViewExcludePatternsWithUndo(['dist/**'], {
      createAction,
      executeAction,
      analyzeAndSendData,
    });

    expect(createAction).toHaveBeenCalledWith(['dist/**'], analyzeAndSendData);
    expect(executeAction).toHaveBeenCalledWith(createdAction);
  });
});
