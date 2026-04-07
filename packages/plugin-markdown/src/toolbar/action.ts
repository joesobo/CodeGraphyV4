import type {
  CodeGraphyAPI,
  Disposable,
  IGraphEdge,
  IToolbarAction,
} from '@codegraphy-vscode/plugin-api';
import manifest from '../../codegraphy.json';
import { buildWikilinkSummaryMarkdown } from '../summary/markdown';

function getMarkdownReferenceEdges(api: CodeGraphyAPI): IGraphEdge[] {
  return api
    .filterEdgesByKind('reference')
    .filter(edge => edge.sources.some(source => source.pluginId === manifest.id));
}

export function createWikilinkToolbarAction(api: CodeGraphyAPI): IToolbarAction {
  return {
    id: 'wikilinks',
    label: 'Wikilinks',
    description: 'Open plugin-provided wikilink tools',
    items: [
      {
        id: 'wikilink-summary',
        label: 'Markdown Wikilink Summary',
        description: 'Export a markdown summary of linked and orphan notes',
        async run() {
          const graph = api.getGraph();
          const wikilinkEdges = getMarkdownReferenceEdges(api);
          const markdown = buildWikilinkSummaryMarkdown(graph, wikilinkEdges);

          await api.saveExport({
            filename: 'markdown-wikilink-summary.md',
            content: markdown,
            title: 'Export Markdown Wikilink Summary',
            successMessage: 'Markdown wikilink summary exported',
          });
        },
      },
    ],
  };
}

export function registerWikilinkToolbarAction(api: CodeGraphyAPI): Disposable {
  return api.registerToolbarAction(createWikilinkToolbarAction(api));
}
