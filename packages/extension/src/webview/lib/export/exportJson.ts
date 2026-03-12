import type { IGraphData } from '../../../shared/types';
import { buildExportData } from '../exportData';
import { postMessage } from '../vscodeApi';
import { createExportTimestamp, getExportContext } from './common';
import { graphStore } from '../../store';

export function exportAsJson(data: IGraphData): void {
  try {
    const { groups, pluginStatuses } = graphStore.getState();
    const exportData = buildExportData(data, groups, pluginStatuses, getExportContext());
    const timestamp = createExportTimestamp();

    postMessage({
      type: 'EXPORT_JSON',
      payload: {
        json: JSON.stringify(exportData, null, 2),
        filename: `codegraphy-connections-${timestamp}.json`,
      },
    });
  } catch (error) {
    console.error('[CodeGraphy] JSON export failed:', error);
  }
}
