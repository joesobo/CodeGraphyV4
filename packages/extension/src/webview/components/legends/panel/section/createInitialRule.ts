import type { IGroup } from '../../../../../shared/settings/groups';
import type { LegendTargetSection } from './contracts';
import { DEFAULT_NODE_SHAPE } from './visual';

export function createInitialVisualRule(target: LegendTargetSection): Partial<IGroup> {
  return target === 'node' ? { ...DEFAULT_NODE_SHAPE } : {};
}
