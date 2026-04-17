import { describe, expect, it, vi } from 'vitest';
import { createGraphViewProviderPublicMethodDelegates } from '../../../../../../src/extension/graphView/provider/source/delegates/public';
import { createMethodSourceOwnerStub } from '../fakes';

describe('source/delegates/public', () => {
  it('forwards public helper delegates to view-selection and command methods', async () => {
    const owner = createMethodSourceOwnerStub();
    owner._notifyExtensionMessage = vi.fn();
    const delegates = createGraphViewProviderPublicMethodDelegates(owner);

    await delegates.setDepthMode(true);
    delegates.setFocusedFile('src/app.ts');
    await delegates.setDepthLimit(4);
    expect(await delegates.undo()).toBe('undo');
    expect(await delegates.redo()).toBe('redo');
    delegates._notifyExtensionMessage({ type: 'EXTENSION_MESSAGE' });

    expect(owner._viewSelectionMethods.setDepthMode).toHaveBeenCalledWith(true);
    expect(owner._viewSelectionMethods.setFocusedFile).toHaveBeenCalledWith('src/app.ts');
    expect(owner._viewSelectionMethods.setDepthLimit).toHaveBeenCalledWith(4);
    expect(owner._commandMethods.undo).toHaveBeenCalledTimes(1);
    expect(owner._commandMethods.redo).toHaveBeenCalledTimes(1);
    expect(owner._notifyExtensionMessage).toHaveBeenCalledWith({
      type: 'EXTENSION_MESSAGE',
    });
  });
});
