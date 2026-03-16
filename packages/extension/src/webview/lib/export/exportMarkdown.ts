import type { IGraphData, IGroup, IPluginStatus } from '../../../shared/types';
import { graphStore } from '../../store';
import { postMessage } from '../vscodeApi';
import {
  buildExportData,
} from './exportJson';
import { createExportTimestamp, getExportContext } from './common';
import { renderMarkdownExport } from './exportMarkdownRenderer';
import type { ExportBuildContext } from './exportTypes';

export function exportAsMarkdown(data: IGraphData): void {
  try {
    const { groups, pluginStatuses } = graphStore.getState();
    const markdown = buildMarkdownExport(data, groups, pluginStatuses, getExportContext());
    const timestamp = createExportTimestamp();

    postMessage({
      type: 'EXPORT_MD',
      payload: {
        markdown,
        filename: `codegraphy-connections-${timestamp}.md`,
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
