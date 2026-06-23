import { replayDuplicateWebviewReady } from '../ready';
import type {
  GraphViewMessageListenerContext,
  WebviewReadyDelivery,
  WebviewReadyMessage,
  WebviewReadyTracking,
} from './contracts';
import { shouldIgnoreDuplicateReady } from './readyDuplicate';
import { createReadyState } from './readyState';

export function getWebviewReadyDelivery(message: WebviewReadyMessage): WebviewReadyDelivery {
  const payload = (message as { payload?: unknown }).payload;
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const pageId = (payload as { pageId?: unknown }).pageId;
  const postedAt = (payload as { postedAt?: unknown }).postedAt;
  return {
    ...(typeof pageId === 'string' && pageId.length > 0 ? { pageId } : {}),
    ...(typeof postedAt === 'number' && Number.isFinite(postedAt) ? { postedAt } : {}),
  };
}

export async function handleWebviewReadyMessage(
  context: GraphViewMessageListenerContext,
  delivery: WebviewReadyDelivery,
  tracking: WebviewReadyTracking,
): Promise<boolean> {
  if (!tracking.handled) {
    tracking.handled = true;
    tracking.pageId = delivery.pageId;
    return false;
  }

  if (shouldIgnoreDuplicateReady(delivery, tracking)) {
    return true;
  }

  tracking.pageId = delivery.pageId;
  await replayDuplicateWebviewReady(createReadyState(context), context);
  return true;
}

export function markWebviewReadyCompleted(
  tracking: WebviewReadyTracking,
  isWebviewReadyMessage: boolean,
): void {
  if (isWebviewReadyMessage) {
    tracking.completedAt = Date.now();
  }
}
