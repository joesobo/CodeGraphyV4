import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';

export interface GraphViewTimelineHandlers {
  indexRepository(): Promise<void>;
  jumpToCommit(sha: string): Promise<void>;
  previewFileAtCommit(sha: string, filePath: string): Promise<void>;
}

export async function applyTimelineMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewTimelineHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'INDEX_REPO':
      void handlers.indexRepository();
      return true;

    case 'JUMP_TO_COMMIT':
      await handlers.jumpToCommit(message.payload.sha);
      return true;

    case 'PREVIEW_FILE_AT_COMMIT':
      void handlers.previewFileAtCommit(message.payload.sha, message.payload.filePath);
      return true;

    default:
      return false;
  }
}
