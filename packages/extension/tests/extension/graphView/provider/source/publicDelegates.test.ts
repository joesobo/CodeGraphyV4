import { describe, expect, it } from 'vitest';
import { createGraphViewProviderPublicMethodDelegates } from '../../../../../src/extension/graphView/provider/source/publicDelegates';
import { createMethodSourceOwnerStub } from './fakes';

describe('source/publicDelegates', () => {
  it('forwards public helper delegates to view-selection and command methods', async () => {
    const owner = createMethodSourceOwnerStub();
    const delegates = createGraphViewProviderPublicMethodDelegates(owner);

    await delegates.changeView('codegraphy.folder');
    await delegates.setDepthLimit(4);
    expect(await delegates.undo()).toBe('undo');
    expect(await delegates.redo()).toBe('redo');

    expect(owner._viewSelectionMethods.changeView).toHaveBeenCalledWith('codegraphy.folder');
    expect(owner._viewSelectionMethods.setDepthLimit).toHaveBeenCalledWith(4);
    expect(owner._commandMethods.undo).toHaveBeenCalledTimes(1);
    expect(owner._commandMethods.redo).toHaveBeenCalledTimes(1);
  });
});
