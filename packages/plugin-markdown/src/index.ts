/**
 * @fileoverview Markdown plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual source modules in sources/.
 * @module plugins/markdown
 */

import type {
  CodeGraphyAPI,
  Disposable,
  IConnection,
  IGraphData,
  IGraphEdge,
  IPlugin,
} from '@codegraphy-vscode/plugin-api';
import { PathResolver } from './PathResolver';
import manifest from '../codegraphy.json';

// Source detect functions
import { detect as detectWikilink } from './sources/wikilink';

export { PathResolver } from './PathResolver';
export type { IDetectedWikilink, MarkdownRuleContext } from './sources/wikilink';

function buildWikilinkSummaryMarkdown(
  graph: IGraphData,
  referenceEdges: IGraphEdge[],
): string {
  const linkedNodeIds = new Set<string>();
  const linkCounts = new Map<string, number>();
  for (const edge of referenceEdges) {
    linkCounts.set(edge.from, (linkCounts.get(edge.from) ?? 0) + 1);
    linkCounts.set(edge.to, (linkCounts.get(edge.to) ?? 0) + 1);
    linkedNodeIds.add(edge.from);
    linkedNodeIds.add(edge.to);
  }

  const nodes = graph.nodes.filter(node => node.nodeType !== 'folder');
  const rankedNodes = nodes
    .map(node => {
      const linkCount = linkCounts.get(node.id) ?? 0;
      const neighborCount = linkedNodeIds.has(node.id) ? 1 : 0;
      return {
        node,
        linkCount,
        neighborCount,
      };
    })
    .sort((left, right) => {
      if (right.linkCount !== left.linkCount) return right.linkCount - left.linkCount;
      if (right.neighborCount !== left.neighborCount) return right.neighborCount - left.neighborCount;
      return left.node.label.localeCompare(right.node.label);
    });

  const topNodes = rankedNodes.filter(entry => entry.linkCount > 0).slice(0, 10);
  const orphanNodes = rankedNodes.filter(entry => entry.neighborCount === 0);

  return [
    '# Wikilink Summary',
    '',
    `- Notes: ${nodes.length}`,
    `- Wikilinks: ${referenceEdges.length}`,
    `- Orphan notes: ${orphanNodes.length}`,
    '',
    '## Most linked notes',
    topNodes.length > 0
      ? topNodes
          .map(entry =>
            `- \`${entry.node.label}\` (${entry.linkCount} wikilinks, ${entry.neighborCount} neighbors)`,
          )
          .join('\n')
      : '- None',
    '',
    '## Orphan notes',
    orphanNodes.length > 0
      ? orphanNodes.map(entry => `- \`${entry.node.label}\``).join('\n')
      : '- None',
    '',
  ].join('\n');
}

/**
 * Built-in plugin for Markdown files.
 *
 * Detects Obsidian-style [[wikilinks]] between .md files and maps them
 * to file connections in the graph. Supports:
 * - `[[Note Name]]` — basic wikilink
 * - `[[Note Name|Alias]]` — wikilink with display alias
 * - `[[folder/note]]` — wikilink with path
 * - `[[Note#heading]]` — heading fragment (stripped for resolution)
 * - `![[embed]]` — embedded content (treated as link)
 */
export function createMarkdownPlugin(): IPlugin {
  const resolver = new PathResolver(String());
  const exporterDisposables: Disposable[] = [];

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    sources: manifest.sources,
    fileColors: manifest.fileColors,

    onLoad(api: CodeGraphyAPI): void {
      exporterDisposables.push(
        api.registerExporter({
          id: 'wikilink-summary',
          label: 'Wikilink Summary',
          description: 'Export a markdown summary of linked and orphan notes',
          group: 'Markdown',
          async run() {
            const graph = api.getGraph();
            const wikilinkEdges = api
              .filterEdgesByKind('reference')
              .filter(edge =>
                edge.sources.some(source => source.pluginId === manifest.id),
              );
            const markdown = buildWikilinkSummaryMarkdown(
              graph,
              wikilinkEdges,
            );

            await api.saveExport({
              filename: 'wikilink-summary.md',
              content: markdown,
              title: 'Export Wikilink Summary',
              successMessage: 'Wikilink summary exported',
            });
          },
        }),
      );
    },

    async initialize(workspaceRoot: string): Promise<void> {
      resolver.setWorkspaceRoot(workspaceRoot);
    },

    async onPreAnalyze(
      files: Array<{
        absolutePath: string;
        relativePath: string;
        content: string;
      }>,
      workspaceRoot: string
    ): Promise<void> {
      resolver.setWorkspaceRoot(workspaceRoot);
      resolver.buildIndex(files);
    },

    async detectConnections(
      filePath: string,
      content: string,
      _workspaceRoot: string
    ): Promise<IConnection[]> {
      return detectWikilink(content, filePath, { resolver });
    },

    onUnload(): void {
      while (exporterDisposables.length > 0) {
        exporterDisposables.pop()?.dispose();
      }
    },
  };
}

export default createMarkdownPlugin;
