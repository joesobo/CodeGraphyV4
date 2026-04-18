/**
 * @fileoverview Registration helpers for plugin host renderers/overlays/tooltips.
 * @module webview/pluginHost/api/registration
 */

import type { NodeRenderFn, OverlayRenderFn, TooltipProviderFn, WebviewDisposable } from '../contracts';
import type { GraphPluginSlot } from '../contracts';
import {
  attachSlotHost as attachSlotHostImpl,
  detachSlotHost as detachSlotHostImpl,
  getOrCreateContainer as getOrCreateContainerImpl,
  getOrCreateSlotContainer as getOrCreateSlotContainerImpl,
  type SlotContainerMap,
  type SlotHostMap,
} from './containers';
import {
  registerNodeRenderer as registerNodeRendererImpl,
  registerOverlay as registerOverlayImpl,
  registerTooltipProvider as registerTooltipProviderImpl,
} from './renderers';
import { syncSlotHostVisibility as syncSlotHostVisibilityImpl } from './visibility';

export function syncSlotHostVisibility(slot: GraphPluginSlot, slotHosts: SlotHostMap): void {
  syncSlotHostVisibilityImpl(slot, slotHosts);
}

export function registerNodeRenderer(
  pluginId: string,
  type: string,
  fn: NodeRenderFn,
  nodeRenderers: Map<string, { pluginId: string; fn: NodeRenderFn }>,
): WebviewDisposable {
  return registerNodeRendererImpl(pluginId, type, fn, nodeRenderers);
}

export function registerOverlay(
  pluginId: string,
  id: string,
  fn: OverlayRenderFn,
  overlays: Map<string, { pluginId: string; fn: OverlayRenderFn }>,
): WebviewDisposable {
  return registerOverlayImpl(pluginId, id, fn, overlays);
}

export function registerTooltipProvider(
  pluginId: string,
  fn: TooltipProviderFn,
  tooltipProviders: Array<{ pluginId: string; fn: TooltipProviderFn }>,
): WebviewDisposable {
  return registerTooltipProviderImpl(pluginId, fn, tooltipProviders);
}

export function getOrCreateContainer(
  pluginId: string,
  containers: Map<string, HTMLDivElement>,
): HTMLDivElement {
  return getOrCreateContainerImpl(pluginId, containers);
}

export function getOrCreateSlotContainer(
  pluginId: string,
  slot: GraphPluginSlot,
  slotContainers: SlotContainerMap,
  slotHosts: SlotHostMap,
): HTMLDivElement {
  return getOrCreateSlotContainerImpl(pluginId, slot, slotContainers, slotHosts);
}

export function attachSlotHost(
  slot: GraphPluginSlot,
  host: HTMLDivElement,
  slotContainers: SlotContainerMap,
  slotHosts: SlotHostMap,
): void {
  attachSlotHostImpl(slot, host, slotContainers, slotHosts);
}

export function detachSlotHost(
  slot: GraphPluginSlot,
  slotHosts: SlotHostMap,
): void {
  detachSlotHostImpl(slot, slotHosts);
}
