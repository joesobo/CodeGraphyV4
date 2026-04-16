import { describe, expect, it } from 'vitest';
import { defineGraphViewProviderMethodAccessors } from '../../../../../src/extension/graphView/provider/runtime/methodAccessors';

describe('graphView/provider/runtime/methodAccessors', () => {
  it('defines instance accessors that read from the method container bag', () => {
    const methodContainers = {
      analysis: { id: 'analysis' },
      command: { id: 'command' },
      fileAction: { id: 'fileAction' },
      fileVisit: { id: 'fileVisit' },
      physicsSettings: { id: 'physicsSettings' },
      plugin: { id: 'plugin' },
      pluginResource: { id: 'pluginResource' },
      refresh: { id: 'refresh' },
      settingsState: { id: 'settingsState' },
      timeline: { id: 'timeline' },
      viewContext: { id: 'viewContext' },
      viewSelection: { id: 'viewSelection' },
      webview: { id: 'webview' },
    };
    const target = {
      _methodContainers: methodContainers,
    };

    defineGraphViewProviderMethodAccessors(target as never);

    expect((target as typeof target & { _analysisMethods: unknown })._analysisMethods).toBe(
      methodContainers.analysis,
    );
    expect((target as typeof target & { _commandMethods: unknown })._commandMethods).toBe(
      methodContainers.command,
    );
    expect((target as typeof target & { _fileActionMethods: unknown })._fileActionMethods).toBe(
      methodContainers.fileAction,
    );
    expect((target as typeof target & { _fileVisitMethods: unknown })._fileVisitMethods).toBe(
      methodContainers.fileVisit,
    );
    expect(
      (target as typeof target & { _physicsSettingsMethods: unknown })._physicsSettingsMethods,
    ).toBe(methodContainers.physicsSettings);
    expect((target as typeof target & { _pluginMethods: unknown })._pluginMethods).toBe(
      methodContainers.plugin,
    );
    expect(
      (target as typeof target & { _pluginResourceMethods: unknown })._pluginResourceMethods,
    ).toBe(methodContainers.pluginResource);
    expect((target as typeof target & { _refreshMethods: unknown })._refreshMethods).toBe(
      methodContainers.refresh,
    );
    expect(
      (target as typeof target & { _settingsStateMethods: unknown })._settingsStateMethods,
    ).toBe(methodContainers.settingsState);
    expect((target as typeof target & { _timelineMethods: unknown })._timelineMethods).toBe(
      methodContainers.timeline,
    );
    expect((target as typeof target & { _viewContextMethods: unknown })._viewContextMethods).toBe(
      methodContainers.viewContext,
    );
    expect(
      (target as typeof target & { _viewSelectionMethods: unknown })._viewSelectionMethods,
    ).toBe(methodContainers.viewSelection);
    expect((target as typeof target & { _webviewMethods: unknown })._webviewMethods).toBe(
      methodContainers.webview,
    );
  });
});
