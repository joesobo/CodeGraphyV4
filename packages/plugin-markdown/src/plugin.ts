/**
 * @fileoverview Markdown plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual source modules in sources/.
 * @module plugins/markdown
 */

import type {
  IFileAnalysisResult,
  IPlugin,
} from '@codegraphy-dev/plugin-api';
import { PathResolver } from './PathResolver';
import manifest from '../codegraphy.json';

// Source detect functions
import { detect as detectWikilink } from './sources/wikilink';

export { PathResolver } from './PathResolver';
export type { IDetectedWikilink, MarkdownRuleContext } from './sources/wikilink';

function isBinaryContent(content: string): boolean {
  return content.includes('\u0000');
}

/**
 * Built-in plugin for Markdown files.
 *
 * Detects Obsidian-style [[wikilinks]] in any file and maps them
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
    const connections = isBinaryContent(content)
      ? []
      : detectWikilink(content, filePath, { resolver });

    return {
      filePath,
      relations: connections,
    };
  };

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    updateImpact: manifest.updateImpact as IPlugin['updateImpact'],
    sources: manifest.sources,
    contributeGraphScopeCapabilities: () => ({ edgeTypes: ['reference'] }),

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

    async onFilesChanged(
      _files: Array<{
        absolutePath: string;
        relativePath: string;
        content: string;
      }>,
      workspaceRoot: string,
    ): Promise<void> {
      resolver.setWorkspaceRoot(workspaceRoot);
    },

    async analyzeFile(
      filePath: string,
      content: string,
      _workspaceRoot: string,
    ): Promise<IFileAnalysisResult> {
      return buildAnalysisResult(filePath, content);
    },
  };
}

export default createMarkdownPlugin;
