import type { SearchOptions } from '../components/searchBar/field/model';
import { DEFAULT_PHYSICS_SETTINGS, type IPhysicsSettings } from '../../shared/settings/physics';

export const DEFAULT_PHYSICS: IPhysicsSettings = DEFAULT_PHYSICS_SETTINGS;

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  matchCase: false,
  wholeWord: false,
  regex: false,
};
