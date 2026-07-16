import type { IGraphData } from '../../../shared/graph/contracts';
import { graphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';
import { createExportTimestamp } from '../shared/context';
import { buildExportData } from './build/document';

export type {
  ExportData,
  ExportEdgeEntry,
  ExportEdgeSourceEntry,
  ExportLegendRule,
  ExportNodeEntry,
} from '../shared/contracts';
export { buildExportData } from './build/document';

export function exportAsJson(data: IGraphData): void {
  try {
    const { legends, pluginStatuses } = graphStore.getState();
    const exportData = buildExportData(data, legends, pluginStatuses);
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
