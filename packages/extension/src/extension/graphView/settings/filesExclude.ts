import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';

export interface FilesExcludeStateSource {
  getFilesExcludedCount?(): number;
  getRespectFilesExclude?(): boolean;
}

export function sendFilesExcludeState(
  source: FilesExcludeStateSource | undefined,
  sendMessage: (message: ExtensionToWebviewMessage) => void,
): void {
  sendMessage({
    type: 'FILES_EXCLUDE_UPDATED',
    payload: {
      enabled: source?.getRespectFilesExclude?.() ?? true,
      excludedCount: source?.getFilesExcludedCount?.() ?? 0,
    },
  });
}
