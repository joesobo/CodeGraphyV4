import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';

export interface GraphViewNodeFileNavigationHandlers {
  revealInExplorer(filePath: string): Promise<void>;
  copyToClipboard(text: string): Promise<void>;
  analyzeAndSendData(): Promise<void>;
  getFileInfo(filePath: string): Promise<void>;
}

export async function applyNodeFileNavigationMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewNodeFileNavigationHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'REVEAL_IN_EXPLORER':
      void handlers.revealInExplorer(message.payload.path);
      return true;

    case 'COPY_TO_CLIPBOARD':
      void handlers.copyToClipboard(message.payload.text);
      return true;

    case 'REFRESH_GRAPH':
      await handlers.analyzeAndSendData();
      return true;

    case 'GET_FILE_INFO':
      void handlers.getFileInfo(message.payload.path);
      return true;

    default:
      return false;
  }
}
