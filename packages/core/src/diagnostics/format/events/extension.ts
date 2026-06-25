import type { DiagnosticContextValue } from '../../contracts';
import {
  formatContextDetail,
  joinDetails,
} from '../parts';

export function formatExtensionLifecycleEvent(
  event: string,
  context: Record<string, DiagnosticContextValue> | undefined,
): string | undefined {
  if (event === 'activation-started') {
    return `Extension activation started: ${joinDetails([
      formatContextDetail(context, 'workspaceFolders'),
    ])}`;
  }

  if (event === 'activation-completed') {
    return `Extension activation complete: ${joinDetails([
      formatContextDetail(context, 'registeredWebviewProviders'),
    ])}`;
  }

  return undefined;
}

export function formatExtensionWebviewEvent(
  event: string,
  context: Record<string, DiagnosticContextValue> | undefined,
): string | undefined {
  if (event === 'ready-replayed') {
    return `Webview ready replayed: ${joinDetails([
      formatContextDetail(context, 'hasWorkspace'),
      formatContextDetail(context, 'firstAnalysis'),
      formatContextDetail(context, 'readyNotified'),
      formatContextDetail(context, 'maxFiles'),
    ])}`;
  }

  if (event === 'bootstrap-completed') {
    return `Webview bootstrap complete: ${joinDetails([
      formatContextDetail(context, 'hasWorkspace'),
      formatContextDetail(context, 'firstAnalysis'),
      formatContextDetail(context, 'readyNotified'),
    ])}`;
  }

  return undefined;
}
