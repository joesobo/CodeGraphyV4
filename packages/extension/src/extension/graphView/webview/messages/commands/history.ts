import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type { GraphViewCommandHandlers } from './dispatch';

export async function applyHistoryCommand(
  message: WebviewToExtensionMessage,
  handlers: GraphViewCommandHandlers,
): Promise<boolean> {
  if (message.type === 'UNDO') {
    const undoDescription = await handlers.undo();
    handlers.showInformationMessage(
      undoDescription ? `Undo: ${undoDescription}` : 'Nothing to undo',
    );
    return true;
  }

  if (message.type === 'REDO') {
    const redoDescription = await handlers.redo();
    handlers.showInformationMessage(
      redoDescription ? `Redo: ${redoDescription}` : 'Nothing to redo',
    );
    return true;
  }

  return false;
}
