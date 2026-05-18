/**
 * @fileoverview Extension-owned graph view registrations.
 * @module core/views/catalog
 */

import { IView } from './contracts';

/** Default graph transform registered by the VS Code extension host. */
export const baseGraphView: IView = {
  id: 'codegraphy.graph',
  name: 'Graph',
  icon: 'symbol-file',
  description: 'Base graph transform for the unified graph surface',

  transform(data, _context) {
    // Pass through - presentation state owns the built-in graph experience.
    return data;
  },
};

/** View transforms the extension registers on startup. */
export const coreViews: IView[] = [
  baseGraphView,
];
