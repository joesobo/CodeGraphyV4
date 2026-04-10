/**
 * @fileoverview File-level edge projection used by the extension pipeline.
 * @module core/plugins/types/projectedConnection
 */

import type { GraphEdgeKind, GraphMetadata } from '../../../../../plugin-api/src';

/**
 * Represents one file-level edge projected from richer analysis relations.
 *
 * This is an extension-internal compatibility shape used by the current
 * graph/timeline pipeline while the rest of the host still consumes
 * file-to-file edges.
 */
export interface IProjectedConnection {
  /** Semantic meaning of the projected edge. */
  kind: GraphEdgeKind;

  /** Provenance for the plugin or core analyzer that emitted this edge. */
  pluginId?: string;

  /** The source that detected this edge. */
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
