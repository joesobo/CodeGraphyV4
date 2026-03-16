/**
 * @fileoverview Type-safe wrapper for CodeGraphy extension settings.
 * Provides typed access to all configuration values with proper defaults.
 * @module extension/Configuration
 */

export { DEFAULT_EXCLUDE_PATTERNS } from './configDefaults';
export type { ICodeGraphyConfig } from './configDefaults';
export { Configuration } from './configReaders';
