import type { GraphViewMessageListenerContext } from '../messages/listener';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from './listener';
import { createGraphViewProviderMessagePluginContext } from './pluginContext';
import { createGraphViewProviderMessagePrimaryActions } from './primaryActions';
import { createGraphViewProviderMessageReadContext } from './readContext';
import { createGraphViewProviderMessageSettingsContext } from './settingsContext/create';

export function createGraphViewProviderMessageContext(
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies,
): GraphViewMessageListenerContext {
  return {
    ...createGraphViewProviderMessageReadContext(source, dependencies),
    ...createGraphViewProviderMessagePrimaryActions(source, dependencies),
    ...createGraphViewProviderMessageSettingsContext(source, dependencies),
    ...createGraphViewProviderMessagePluginContext(source, dependencies),
  };
}
