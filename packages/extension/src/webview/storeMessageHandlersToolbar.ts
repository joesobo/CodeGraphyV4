/**
 * @fileoverview Store message handlers for toolbar cycle/toggle commands.
 * @module webview/storeMessageHandlersToolbar
 */

import type { ExtensionToWebviewMessage } from '../shared/types';
import type { IHandlerContext, PartialState } from './storeMessageTypes';
import { DAG_MODE_CYCLE } from './storeMessageTypes';

export function handleCycleView(
  _message: ExtensionToWebviewMessage,
  ctx: IHandlerContext,
): void {
  const { availableViews, activeViewId } = ctx.getState();
  if (availableViews.length === 0) return;
  const idx = availableViews.findIndex((view) => view.id === activeViewId);
  const next = availableViews[(idx + 1) % availableViews.length];
  ctx.postMessage({ type: 'CHANGE_VIEW', payload: { viewId: next.id } });
}

export function handleCycleLayout(
  _message: ExtensionToWebviewMessage,
  ctx: IHandlerContext,
): void {
  const { dagMode } = ctx.getState();
  const idx = DAG_MODE_CYCLE.indexOf(dagMode);
  const nextMode = DAG_MODE_CYCLE[(idx + 1) % DAG_MODE_CYCLE.length];
  ctx.postMessage({ type: 'UPDATE_DAG_MODE', payload: { dagMode: nextMode } });
}

export function handleToggleDimension(
  _message: ExtensionToWebviewMessage,
  ctx: IHandlerContext,
): PartialState {
  const { graphMode } = ctx.getState();
  return { graphMode: graphMode === '2d' ? '3d' : '2d' };
}
