/**
 * @fileoverview Types used by the link curvature module.
 * @module webview/components/graphModel/linkCurvatureTypes
 */

/** Source/target reference -- string ID or object with optional id. */
export type NodeRef = string | number | { id?: string | number } | undefined;

/** Minimal link shape needed for curvature computation. */
export interface CurvatureLink {
  source?: NodeRef;
  target?: NodeRef;
  curvature?: number;
  nodePairId?: string;
}
