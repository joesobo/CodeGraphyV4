import type { SearchOptions } from '../components/searchBar/field/model';
import type { IPhysicsSettings } from '../../shared/settings/physics';

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
