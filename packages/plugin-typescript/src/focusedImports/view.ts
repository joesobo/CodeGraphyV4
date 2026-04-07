import type { IGraphData, IView, IViewContext } from '@codegraphy-vscode/plugin-api';
import { filterFocusedImportGraph } from './filter';

export const FOCUSED_IMPORT_VIEW_ID = 'codegraphy.typescript.focused-imports';
export const FOCUSED_IMPORT_VIEW_NAME = 'Focused Imports';

export function createFocusedImportView(pluginId: string): IView {
  return {
    id: FOCUSED_IMPORT_VIEW_ID,
    name: FOCUSED_IMPORT_VIEW_NAME,
    icon: 'symbol-file',
    description: 'Shows the import neighborhood around the focused file',
    recomputeOn: ['focusedFile', 'depthLimit'],
    transform(data: IGraphData, context: IViewContext): IGraphData {
      return filterFocusedImportGraph(data, context, pluginId);
    },
  };
}
