/**
 * @fileoverview Host-defined base graph transforms kept for compatibility with
 * the plugin view registry.
 * @module core/views/catalog
 */

import { IView } from './contracts';

/**
 * Legacy base-graph view registration kept for plugin API compatibility.
 *
 * CodeGraphy's built-in experience is now one unified graph surface, but the
 * host still keeps a pass-through base transform registered for optional
 * plugin-defined view integrations.
 */
export const baseGraphView: IView = {
  id: 'codegraphy.graph',
  name: 'Graph',
  icon: 'symbol-file',
  description: 'Base graph transform for the unified graph surface',

  transform(data, _context) {
    // Pass through - the unified graph surface owns the built-in experience.
    return data;
  },
};

/** Base transforms the host registers on startup. */
export const coreViews: IView[] = [
  baseGraphView,
];
