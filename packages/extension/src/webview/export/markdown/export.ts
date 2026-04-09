import type { IGraphData } from '../../../shared/graph/types';
import type { IPluginStatus } from '../../../shared/plugins/status';
import type { IGroup } from '../../../shared/settings/groups';
import { graphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';
import { buildExportData } from '../json/export';
import { createExportTimestamp, getExportContext } from '../shared/context';
import { renderMarkdownExport } from './renderer';
import type { ExportBuildContext } from '../shared/contracts';

export function exportAsMarkdown(data: IGraphData): void {
  try {
    const { groups, pluginStatuses } = graphStore.getState();
    const markdown = buildMarkdownExport(data, groups, pluginStatuses, getExportContext());
    const timestamp = createExportTimestamp();

    postMessage({
      type: 'EXPORT_MD',
      payload: {
        markdown,
        filename: `codegraphy-graph-${timestamp}.md`,
      },
    });
  } catch (error) {
    console.error('[CodeGraphy] Markdown export failed:', error);
  }
}

export function buildMarkdownExport(
  graphData: IGraphData,
  groups: IGroup[],
  pluginStatuses: IPluginStatus[] = [],
  context: ExportBuildContext = {},
): string {
  return renderMarkdownExport(buildExportData(graphData, groups, pluginStatuses, context));
}
