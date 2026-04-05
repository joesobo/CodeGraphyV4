/**
 * @fileoverview Extension-local view registry contracts.
 * Re-exports the canonical plugin API view types and adds registry metadata.
 * @module core/views/contracts
 */

export type {
  IView,
  IViewContext,
  ViewDependency,
} from '../../../../plugin-api/src/views';

/**
 * Information about a registered view.
 */
export interface IViewInfo {
  /** The view instance */
  view: import('../../../../plugin-api/src/views').IView;
  /** Whether this is a core (built-in) view */
  core: boolean;
  /** Registration order (lower = registered earlier) */
  order: number;
}

/**
 * View change event payload.
 */
export interface IViewChangeEvent {
  /** Previous view ID (undefined if first selection) */
  previousViewId?: string;
  /** New view ID */
  newViewId: string;
}
