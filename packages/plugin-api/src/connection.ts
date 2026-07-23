/**
 * @fileoverview Source metadata for plugin-contributed relation families.
 * @module @codegraphy-dev/plugin-api/connection
 */

/**
 * Represents a connection source declared by a plugin.
 * Sources describe categories of relations a plugin can emit and
 * carry provenance metadata through graph edges, queries, and exports.
 */
export interface IConnectionSource {
  /** Unique identifier within the plugin (e.g., 'es6-import', 'preload'). */
  id: string;
  /** Human-readable name (e.g., 'ES6 Imports'). */
  name: string;
  /** Short description of the relation category. */
  description: string;
}
