/**
 * @fileoverview Markdown plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual source modules in sources/.
 * @module plugins/markdown
 */

import type {
  IConnection,
  IFileAnalysisResult,
  IPlugin,
} from '@codegraphy-vscode/plugin-api';
import { PathResolver } from './PathResolver';
import manifest from '../codegraphy.json';

// Source detect functions
import { detect as detectWikilink } from './sources/wikilink';

export { PathResolver } from './PathResolver';
export type { IDetectedWikilink, MarkdownRuleContext } from './sources/wikilink';

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
  const buildAnalysisResult = async (
    filePath: string,
    content: string,
  ): Promise<IFileAnalysisResult> => {
    const connections = detectWikilink(content, filePath, { resolver });

    return {
      filePath,
      relations: connections.map(connection => ({
        kind: connection.kind,
        sourceId: connection.sourceId,
        fromFilePath: filePath,
        toFilePath: connection.resolvedPath,
        specifier: connection.specifier,
        type: connection.type,
        variant: connection.variant,
        resolvedPath: connection.resolvedPath,
        metadata: connection.metadata,
      })),
    };
  };

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    sources: manifest.sources,
    fileColors: manifest.fileColors,

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

    async analyzeFile(
      filePath: string,
      content: string,
      _workspaceRoot: string,
    ): Promise<IFileAnalysisResult> {
      return buildAnalysisResult(filePath, content);
    },

    async detectConnections(
      filePath: string,
      content: string,
      _workspaceRoot: string
    ): Promise<IConnection[]> {
      const analysis = await buildAnalysisResult(filePath, content);

      return (analysis.relations ?? []).map(relation => ({
        kind: relation.kind,
        sourceId: relation.sourceId,
        specifier: relation.specifier ?? '',
        resolvedPath: relation.resolvedPath ?? relation.toFilePath ?? null,
        type: relation.type,
        variant: relation.variant,
        metadata: relation.metadata,
      }));
    },
  };
}

export default createMarkdownPlugin;
