import type * as vscode from 'vscode';
import type { IViewContext } from '../../../../../core/views/contracts';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IGroup } from '../../../../../shared/settings/groups';
import {
  createEmptyGraphData,
  createEmptyGroups,
  createInitialViewContext,
  createStringSet,
} from '../../runtimeDefaults';

export function createGraphViewProviderRuntimeDataState(): {
  _panels: vscode.WebviewPanel[];
  _graphData: IGraphData;
  _changedFilePaths: string[];
  _rawGraphData: IGraphData;
  _viewContext: IViewContext;
  _groups: IGroup[];
  _userGroups: IGroup[];
  _filterPatterns: string[];
  _disabledPlugins: Set<string>;
} {
  return {
    _panels: [],
    _graphData: createEmptyGraphData(),
    _changedFilePaths: [],
    _rawGraphData: createEmptyGraphData(),
    _viewContext: createInitialViewContext(),
    _groups: createEmptyGroups(),
    _userGroups: createEmptyGroups(),
    _filterPatterns: [],
    _disabledPlugins: createStringSet(),
  };
}
