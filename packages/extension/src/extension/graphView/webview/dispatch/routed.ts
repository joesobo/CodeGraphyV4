import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import { applyCommandMessage } from '../messages/commands/dispatch';
import { applyExportMessage } from '../messages/exports';
import { applyNodeFileMessage } from '../nodeFile/router';
import { applyPhysicsMessage } from '../messages/physics';
import { applySurfaceMessage } from '../messages/surface';
import { applyTimelineMessage } from '../messages/timeline';
import { createGraphViewPrimaryExportHandlers } from './exportHandlers';
import type { GraphViewPrimaryMessageContext, GraphViewPrimaryMessageResult } from './primary';
import { createGraphViewPrimaryNodeFileHandlers } from './primaryState';

export async function dispatchGraphViewPrimaryRouteMessage(
  message: WebviewToExtensionMessage,
  context: GraphViewPrimaryMessageContext,
): Promise<GraphViewPrimaryMessageResult> {
  if (await applyNodeFileMessage(message, createGraphViewPrimaryNodeFileHandlers(context))) {
    return { handled: true };
  }

  if (await applyExportMessage(message, createGraphViewPrimaryExportHandlers(context))) {
    return { handled: true };
  }

  if (await applyCommandMessage(message, context)) {
    return { handled: true };
  }

  if (await applyTimelineMessage(message, context)) {
    return { handled: true };
  }

  if (await applyPhysicsMessage(message, context)) {
    return { handled: true };
  }

  if (await applySurfaceMessage(message)) {
    return { handled: true };
  }

  return { handled: false };
}
