import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerOptions,
  GraphViewProviderMessageListenerSource,
} from './listener';
import { createEditorActions } from './primaryActions/editorActions';
import { createFileActions } from './primaryActions/fileActions';
import { createLegendActions } from './primaryActions/legendActions';
import { createMessageActions } from './primaryActions/messageActions';
import { createPipelineActions } from './primaryActions/pipelineActions';
import { createStateActions } from './primaryActions/stateActions';
import type { GraphViewProviderPrimaryActions } from './primaryActions/types';
import { createViewActions } from './primaryActions/viewActions';
import { createWorkspaceFileActions } from './primaryActions/workspaceFileActions';

export function createGraphViewProviderMessagePrimaryActions(
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies,
  options: GraphViewProviderMessageListenerOptions = {},
): GraphViewProviderPrimaryActions {
  return {
    ...createFileActions(source),
    ...createEditorActions(source),
    ...createPipelineActions(source, options),
    ...createMessageActions(dependencies),
    ...createStateActions(source),
    ...createLegendActions(source),
    ...createWorkspaceFileActions(dependencies),
    ...createViewActions(source),
  };
}
