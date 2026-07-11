import * as vscode from 'vscode';
import type { GraphViewProviderMessageListenerDependencies } from '../listener';
import type { GraphViewProviderPrimaryActions } from './types';

type MessageActions = Pick<
  GraphViewProviderPrimaryActions,
  | 'showInformationMessage'
  | 'showWarningMessage'
>;

export function createMessageActions(
  dependencies: GraphViewProviderMessageListenerDependencies,
): MessageActions {
  return {
    showInformationMessage: detail => {
      dependencies.window.showInformationMessage(detail);
    },
    showWarningMessage: (message, options, deleteAction) => (
      dependencies.window.showWarningMessage?.(message, options, deleteAction)
      ?? vscode.window.showWarningMessage(
        message,
        options,
        deleteAction,
      )
    ) as Thenable<'Delete' | undefined>,
  };
}
