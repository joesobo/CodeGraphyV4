import {
  createGraphViewProviderAnalysisMethods,
} from '../analysis/methods';
import { createGraphViewProviderCommandMethods } from '../commands';
import { createGraphViewProviderFileActionMethods } from '../file/actions';
import { createGraphViewProviderFileVisitMethods } from '../file/visits';
import { createGraphViewProviderPhysicsSettingsMethods } from '../physicsSettings';
import { createGraphViewProviderPluginMethods } from '../plugin/methods';
import { createGraphViewProviderPluginResourceMethods } from '../plugin/resources';
import { createGraphViewProviderRefreshMethods } from '../refresh';
import { createGraphViewProviderSettingsStateMethods } from '../settingsState';
import {
  createGraphViewProviderMethodSource,
  type GraphViewProviderMethodSourceOwner,
} from '../source/create';
import { createGraphViewProviderTimelineMethods } from '../timeline/methods';
import { createGraphViewProviderViewContextMethods } from '../view/context';
import { createGraphViewProviderViewSelectionMethods } from '../view/selection';
import { createGraphViewProviderWebviewMethods } from '../webview/host';

export interface GraphViewProviderMethodContainers {
  analysis: ReturnType<typeof createGraphViewProviderAnalysisMethods>;
  command: ReturnType<typeof createGraphViewProviderCommandMethods>;
  fileAction: ReturnType<typeof createGraphViewProviderFileActionMethods>;
  fileVisit: ReturnType<typeof createGraphViewProviderFileVisitMethods>;
  physicsSettings: ReturnType<typeof createGraphViewProviderPhysicsSettingsMethods>;
  plugin: ReturnType<typeof createGraphViewProviderPluginMethods>;
  pluginResource: ReturnType<typeof createGraphViewProviderPluginResourceMethods>;
  refresh: ReturnType<typeof createGraphViewProviderRefreshMethods>;
  settingsState: ReturnType<typeof createGraphViewProviderSettingsStateMethods>;
  timeline: ReturnType<typeof createGraphViewProviderTimelineMethods>;
  viewContext: ReturnType<typeof createGraphViewProviderViewContextMethods>;
  viewSelection: ReturnType<typeof createGraphViewProviderViewSelectionMethods>;
  webview: ReturnType<typeof createGraphViewProviderWebviewMethods>;
}

export function createGraphViewProviderMethodContainers(
  owner: GraphViewProviderMethodSourceOwner,
): GraphViewProviderMethodContainers {
  const methodSource = createGraphViewProviderMethodSource(owner);

  return {
    analysis: createGraphViewProviderAnalysisMethods(methodSource),
    command: createGraphViewProviderCommandMethods(methodSource),
    fileAction: createGraphViewProviderFileActionMethods(methodSource),
    fileVisit: createGraphViewProviderFileVisitMethods(methodSource),
    physicsSettings: createGraphViewProviderPhysicsSettingsMethods(methodSource),
    plugin: createGraphViewProviderPluginMethods(methodSource),
    pluginResource: createGraphViewProviderPluginResourceMethods(methodSource),
    refresh: createGraphViewProviderRefreshMethods(methodSource),
    settingsState: createGraphViewProviderSettingsStateMethods(methodSource),
    timeline: createGraphViewProviderTimelineMethods(methodSource),
    viewContext: createGraphViewProviderViewContextMethods(methodSource),
    viewSelection: createGraphViewProviderViewSelectionMethods(methodSource),
    webview: createGraphViewProviderWebviewMethods(methodSource),
  };
}
