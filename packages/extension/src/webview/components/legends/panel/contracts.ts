import type { IGroup } from '../../../../shared/settings/groups';

export type LegendTargetSection = 'node' | 'edge';

export interface LegendBuiltInEntry {
  id: string;
  label: string;
  color: string;
}

export type LegendDisplayRule = IGroup;
