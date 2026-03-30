import { describe, expect, it } from 'vitest';
import { createGraphViewProviderAnalysisMethodDelegates } from '../../../../../src/extension/graphView/provider/source/analysisDelegates';
import { createMethodSourceOwnerStub } from './fakes';

describe('source/analysisDelegates', () => {
  it('forwards analysis and plugin-view delegates to the owning method containers', async () => {
    const owner = createMethodSourceOwnerStub();
    const delegates = createGraphViewProviderAnalysisMethodDelegates(owner);
    const message = { type: 'TOGGLE_DIMENSION' } as const;
    const graph = { nodes: [], edges: [] };
    const signal = new AbortController().signal;
    const error = new Error('boom');

    delegates._sendMessage(message);
    delegates._sendAvailableViews();
    delegates._computeMergedGroups();
    delegates._sendGroupsUpdated();
    delegates._updateViewContext();
    delegates._applyViewTransform();
    delegates._sendPluginStatuses();
    delegates._sendDecorations();
    delegates._sendContextMenuItems();
    delegates._sendPluginWebviewInjections();
    await delegates._analyzeAndSendData!();
    await delegates._doAnalyzeAndSendData!(signal, 3);
    delegates._markWorkspaceReady!(graph);
    delegates._isAnalysisStale!(signal, 4);
    delegates._isAbortError!(error);

    expect(owner._webviewMethods._sendMessage).toHaveBeenCalledWith(message);
    expect(owner._viewContextMethods._sendAvailableViews).toHaveBeenCalledTimes(1);
    expect(owner._pluginResourceMethods._computeMergedGroups).toHaveBeenCalledTimes(1);
    expect(owner._pluginMethods._sendGroupsUpdated).toHaveBeenCalledTimes(1);
    expect(owner._viewContextMethods._updateViewContext).toHaveBeenCalledTimes(1);
    expect(owner._viewContextMethods._applyViewTransform).toHaveBeenCalledTimes(1);
    expect(owner._pluginMethods._sendPluginStatuses).toHaveBeenCalledTimes(1);
    expect(owner._pluginMethods._sendDecorations).toHaveBeenCalledTimes(1);
    expect(owner._pluginMethods._sendContextMenuItems).toHaveBeenCalledTimes(1);
    expect(owner._pluginMethods._sendPluginWebviewInjections).toHaveBeenCalledTimes(1);
    expect(owner._analysisMethods._analyzeAndSendData).toHaveBeenCalledTimes(1);
    expect(owner._analysisMethods._doAnalyzeAndSendData).toHaveBeenCalledWith(signal, 3);
    expect(owner._analysisMethods._markWorkspaceReady).toHaveBeenCalledWith(graph);
    expect(owner._analysisMethods._isAnalysisStale).toHaveBeenCalledWith(signal, 4);
    expect(owner._analysisMethods._isAbortError).toHaveBeenCalledWith(error);
  });
});
