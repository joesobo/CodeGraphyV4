import { createExtensionDiagnosticLogger } from '../../../../diagnostics/logger';
import type { GraphViewReadyState } from './contracts';

export function emitWebviewReadyReplayed(state: GraphViewReadyState): void {
  createExtensionDiagnosticLogger({
    isEnabled: () => state.verboseDiagnostics,
  }).emit({
    area: 'extension.webview',
    event: 'ready-replayed',
    context: {
      hasWorkspace: state.hasWorkspace,
      firstAnalysis: state.firstAnalysis,
      readyNotified: state.readyNotified,
      maxFiles: state.maxFiles,
    },
  });
}

export function emitWebviewBootstrapCompleted(state: GraphViewReadyState): void {
  createExtensionDiagnosticLogger({
    isEnabled: () => state.verboseDiagnostics,
  }).emit({
    area: 'extension.webview',
    event: 'bootstrap-completed',
    context: {
      hasWorkspace: state.hasWorkspace,
      firstAnalysis: state.firstAnalysis,
      readyNotified: state.readyNotified,
    },
  });
}
