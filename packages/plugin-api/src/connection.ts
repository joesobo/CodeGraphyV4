/**
 * @fileoverview Connection and source types for plugin analysis.
 * @module @codegraphy-vscode/plugin-api/connection
 */

import type { GraphEdgeKind, GraphMetadata } from './graph';

/**
 * Represents a connection source declared by a plugin.
 * Sources describe categories of relations a plugin can emit and
 * power per-plugin/per-source toggles in the UI.
 */
export interface IConnectionSource {
  /** Unique identifier within the plugin (e.g., 'es6-import', 'preload'). */
  id: string;
  /** Human-readable name (e.g., 'ES6 Imports'). */
  name: string;
  /** Short description shown in the plugin panel. */
  description: string;
}

/**
 * Interface for a source detection module.
 * Each detector exports a detect function matching this shape.
 */
export interface IConnectionDetector<TContext = unknown> {
  /** Source ID — must match the corresponding entry in the plugin manifest. */
  id: string;

  /**
   * Detect connections for this source.
   *
   * @param content  - File content as string
   * @param filePath - Absolute path to the file
   * @param context  - Plugin-specific context (e.g., PathResolver instance)
   * @returns Array of connections. Each MUST have sourceId set to this detector's id.
   */
  detect(content: string, filePath: string, context: TContext): IConnection[];
}

/**
 * Represents one detected connection from one file to another.
 */
export interface IConnection {
  /** Semantic meaning of the connection. */
  kind: GraphEdgeKind;

  /** Provenance for the plugin or core analyzer that emitted this connection. */
  pluginId?: string;

  /** The source that detected this connection. */
  sourceId: string;

  /** Optional import/reference text as written in the file. */
  specifier: string;

  /** The resolved absolute file path, or null if unresolved/external. */
  resolvedPath: string | null;

  /**
   * Optional relation subtype kept for plugin-specific detection detail.
   * Common examples: 'static', 'dynamic', 'require'.
   */
  type?: string;

  /**
   * Optional variant when sourceId alone is not unique enough
   * for relation provenance or identity.
   */
  variant?: string;

  /** Optional scalar-only metadata for display, export, and queries. */
  metadata?: GraphMetadata;
}
