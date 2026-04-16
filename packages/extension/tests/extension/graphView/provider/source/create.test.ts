import { describe, expect, it } from 'vitest';
import { createGraphViewProviderMethodSource } from '../../../../../src/extension/graphView/provider/source/create';
import { createMethodSourceOwnerStub } from './fakes';

describe('source/create', () => {
  it('combines live state accessors with delegated methods', async () => {
    const owner = createMethodSourceOwnerStub();
    const source = createGraphViewProviderMethodSource(owner);

    expect(source._analysisRequestId).toBe(1);

    source._analysisRequestId = 9;
    await source._loadAndSendData();
    await source.undo();
    await source.setDepthMode(true);
    await source._indexRepository();
    source._sendPluginStatuses();
    source._sendSettings();
    source._setFocusedFile('src/app.ts');
    const undoDescriptor = Object.getOwnPropertyDescriptor(source, 'undo');

    expect(owner._analysisRequestId).toBe(9);
    expect(owner._analysisMethods._loadAndSendData).toHaveBeenCalledTimes(1);
    expect(owner._commandMethods.undo).toHaveBeenCalledTimes(1);
    expect(owner._viewSelectionMethods.setDepthMode).toHaveBeenCalledWith(true);
    expect(owner._timelineMethods._indexRepository).toHaveBeenCalledTimes(1);
    expect(owner._pluginMethods._sendPluginStatuses).toHaveBeenCalledTimes(1);
    expect(owner._settingsStateMethods._sendSettings).toHaveBeenCalledTimes(1);
    expect(owner._viewSelectionMethods.setFocusedFile).toHaveBeenCalledWith('src/app.ts');
    expect(undoDescriptor).toMatchObject({
      configurable: true,
      enumerable: true,
      writable: true,
      value: source.undo,
    });

    owner._webviewReadyNotified = true;

    expect(source._webviewReadyNotified).toBe(true);
    expect(source._webviewMethods).toBe(owner._webviewMethods);
  });
});
