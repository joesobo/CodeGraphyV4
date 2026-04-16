import type { IGraphData } from '../../../shared/graph/types';
import { graphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';
import { createExportTimestamp, getExportContext } from '../shared/context';
import { buildExportData } from './build';

export type {
  ExportBuildContext,
  ExportData,
  ExportEdgeEntry,
  ExportEdgeSourceEntry,
  ExportLegendRule,
  ExportNodeEntry,
} from '../shared/contracts';
export { buildExportData } from './build';

export function exportAsJson(data: IGraphData): void {
  try {
    const { legends, pluginStatuses } = graphStore.getState();
    const exportData = buildExportData(data, legends, pluginStatuses, getExportContext());
    const timestamp = createExportTimestamp();

    postMessage({
      type: 'EXPORT_JSON',
      payload: {
        json: JSON.stringify(exportData, null, 2),
        filename: `codegraphy-graph-${timestamp}.json`,
      },
    });
  } catch (error) {
    console.error('[CodeGraphy] JSON export failed:', error);
  }
}
