import type { IGroup } from '../../../../../shared/settings/groups';
import type { LegendIconImport } from '../../../../../shared/protocol/webviewToExtension';

export type LegendTargetSection = 'node' | 'edge';

export interface LegendBuiltInEntry {
  id: string;
  label: string;
  color: string;
}

export type LegendDisplayRule = IGroup;

export type LegendRuleChange = (rule: IGroup, iconImports?: LegendIconImport[]) => void;

export type LegendRulesChange = (rules: IGroup[], iconImports?: LegendIconImport[]) => void;
