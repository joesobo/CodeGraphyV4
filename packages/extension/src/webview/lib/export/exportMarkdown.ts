import type { IGraphData } from '../../../shared/types';
import { buildMarkdownExport } from '../exportMd';
import { postMessage } from '../vscodeApi';
import { createExportTimestamp, getExportContext } from './common';
import { graphStore } from '../../store';

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
