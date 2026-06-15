/**
 * @fileoverview Registration helpers for plugin host renderers/overlays/tooltips.
 * @module webview/pluginHost/api/registration
 */

import type {
  NodeRenderFn,
  OverlayRenderFn,
  PluginSlotContribution,
  PluginSlotRenderContext,
  TooltipProviderFn,
  WebviewDisposable,
} from '../contracts/webview';
import type { GraphPluginSlot } from '../contracts/webview';
import {
  attachSlotHost as attachSlotHostImpl,
  detachSlotHost as detachSlotHostImpl,
  getOrCreateContainer as getOrCreateContainerImpl,
  getOrCreateSlotContainer as getOrCreateSlotContainerImpl,
  registerSlotContribution as registerSlotContributionImpl,
  removePluginSlotContributions as removePluginSlotContributionsImpl,
  type SlotContributionMap,
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
  nodeRenderers: Map<string, Array<{ pluginId: string; fn: NodeRenderFn }>>,
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
  slotContributions?: SlotContributionMap,
): void {
  attachSlotHostImpl(slot, host, slotContainers, slotHosts, slotContributions);
}

export function detachSlotHost(
  slot: GraphPluginSlot,
  slotHosts: SlotHostMap,
): void {
  detachSlotHostImpl(slot, slotHosts);
}

export function registerSlotContribution(
  pluginId: string,
  slot: GraphPluginSlot,
  contribution: PluginSlotContribution,
  context: PluginSlotRenderContext,
  slotContributions: SlotContributionMap,
  slotHosts: SlotHostMap,
): WebviewDisposable {
  return registerSlotContributionImpl(pluginId, slot, contribution, context, slotContributions, slotHosts);
}

export function removePluginSlotContributions(
  pluginId: string,
  slotContributions: SlotContributionMap,
  slotHosts: SlotHostMap,
): void {
  removePluginSlotContributionsImpl(pluginId, slotContributions, slotHosts);
}

export type { SlotContributionMap };
