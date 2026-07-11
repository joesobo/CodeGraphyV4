import type React from 'react';
import type { IPluginFilterPatternGroup } from '../../../../../shared/protocol/extensionToWebview';

export interface FilterPopoverProps {
  disabledCustomPatterns: string[];
  disabledPluginPatterns: string[];
  customPatterns: string[];
  excludedCount: number;
  onDisabledCustomPatternsChange: (patterns: string[]) => void;
  onDisabledPluginPatternsChange: (patterns: string[]) => void;
  onOpenChange?: (open: boolean) => void;
  onPatternsChange: (patterns: string[]) => void;
  onRespectFilesExcludeChange: (enabled: boolean) => void;
  open?: boolean;
  pendingPatterns?: string[];
  pluginGroups: IPluginFilterPatternGroup[];
  pluginPatterns: string[];
  respectFilesExclude: boolean;
}

export interface FilterDraftState {
  addablePatterns: string[];
  canAdd: boolean;
  draftPattern: string;
  draftPendingPatterns: string[];
  setDraftPattern: React.Dispatch<React.SetStateAction<string>>;
  setDraftPendingPatterns: React.Dispatch<React.SetStateAction<string[]>>;
  resetDraft: () => void;
}

export interface FilterSectionState {
  customSectionEnabled: boolean;
  disabledCustom: Set<string>;
  disabledPlugin: Set<string>;
  pluginSectionEnabled: boolean;
  visiblePluginGroups: IPluginFilterPatternGroup[];
}
