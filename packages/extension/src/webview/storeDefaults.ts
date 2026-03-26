/**
 * @fileoverview Default values for the graph store.
 * @module webview/storeDefaults
 */

import type { IPhysicsSettings } from '../shared/contracts';
import type { SearchOptions } from './components/SearchBar';

export const DEFAULT_PHYSICS: IPhysicsSettings = {
  repelForce: 10,
  linkDistance: 80,
  linkForce: 0.15,
  damping: 0.7,
  centerForce: 0.1,
};

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  matchCase: false,
  wholeWord: false,
  regex: false,
};
