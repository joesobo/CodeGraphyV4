/**
 * @fileoverview Plugin API compatibility checks.
 * @module core/plugins/registry/compatibility
 */

import type { IPlugin } from '../../../types/contracts';
import {
  CORE_PLUGIN_API_VERSION,
  WEBVIEW_PLUGIN_API_VERSION,
  parseSemver,
  satisfiesSemverRange,
} from '../../../versioning/apiVersions';

/**
 * Enforces compatibility between plugin apiVersion and host core API version.
 * Throws when incompatible.
 */
export function assertCoreApiCompatibility(pluginId: string, range: string): void {
  if (satisfiesSemverRange(CORE_PLUGIN_API_VERSION, range)) {
    return;
  }

  const normalized = range.trim();
  const host = parseSemver(CORE_PLUGIN_API_VERSION);
  const base = normalized.startsWith('^')
    ? parseSemver(normalized.slice(1))
    : parseSemver(normalized);

  if (!host || !base) {
    throw new Error(
      `Plugin '${pluginId}' declares invalid apiVersion '${range}'. ` +
      `Use '^${CORE_PLUGIN_API_VERSION}' or an exact semver string.`
    );
  }

  if (base.major > host.major) {
    throw new Error(
      `Plugin '${pluginId}' requires future CodeGraphy Plugin API '${range}', ` +
      `but host provides '${CORE_PLUGIN_API_VERSION}'.`
    );
  }

  throw new Error(
    `Plugin '${pluginId}' targets unsupported CodeGraphy Plugin API '${range}'. ` +
    `Host provides '${CORE_PLUGIN_API_VERSION}'.`
  );
}

/**
 * Warns when a plugin declares Tier-2 webview contributions with an incompatible
 * webview API range. This is non-fatal to preserve forward compatibility.
 */
export function warnOnWebviewApiMismatch(plugin: IPlugin): void {
  if (!plugin.webviewContributions || !plugin.webviewApiVersion) return;
  if (satisfiesSemverRange(WEBVIEW_PLUGIN_API_VERSION, plugin.webviewApiVersion)) return;

  console.warn(
    `[CodeGraphy] Plugin '${plugin.id}' declares incompatible webviewApiVersion ` +
    `'${plugin.webviewApiVersion}' (host: '${WEBVIEW_PLUGIN_API_VERSION}'). ` +
    `Webview contributions may not behave as expected.`
  );
}
