/**
 * @fileoverview Plugin API version constants and semver re-exports.
 * @module core/plugins/versioning/apiVersions
 */

export const CORE_PLUGIN_API_VERSION = '2.0.0';
export const WEBVIEW_PLUGIN_API_VERSION = '1.0.0';

export type { ISemver } from './semver/value';
export { compareSemver, parseSemver } from './semver/value';
export { satisfiesSemverRange } from './semver/range';
