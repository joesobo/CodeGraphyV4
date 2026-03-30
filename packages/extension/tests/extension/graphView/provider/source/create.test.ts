import { describe, expect, it } from 'vitest';
import { createGraphViewProviderMethodSource } from '../../../../../src/extension/graphView/provider/source/create';
import { createMethodSourceOwnerStub } from './fakes';

describe('source/create', () => {
  it('combines live state accessors with delegated methods', async () => {
    const owner = createMethodSourceOwnerStub();
    const source = createGraphViewProviderMethodSource(owner);

    expect(source._analysisRequestId).toBe(1);

    source._analysisRequestId = 9;
    await source.undo();
    await source.changeView('codegraphy.folder');
    const undoDescriptor = Object.getOwnPropertyDescriptor(source, 'undo');

    expect(owner._analysisRequestId).toBe(9);
    expect(owner._commandMethods.undo).toHaveBeenCalledTimes(1);
    expect(owner._viewSelectionMethods.changeView).toHaveBeenCalledWith('codegraphy.folder');
    expect(undoDescriptor).toMatchObject({
      configurable: true,
      enumerable: true,
      writable: true,
      value: source.undo,
    });

    owner._webviewReadyNotified = true;

    expect(source._webviewReadyNotified).toBe(true);
  });
});
