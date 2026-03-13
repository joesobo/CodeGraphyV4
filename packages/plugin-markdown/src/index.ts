/**
 * @fileoverview Markdown plugin for CodeGraphy.
 * Thin orchestrator that loads metadata from codegraphy.json and delegates
 * detection to individual rule modules in rules/.
 * @module plugins/markdown
 */

import type { IPlugin, IConnection } from '@codegraphy/plugin-api';
import { PathResolver } from './PathResolver';
import manifest from '../codegraphy.json';

// Rule detect functions
import { detect as detectWikilink } from './rules/wikilink';

export { PathResolver } from './PathResolver';
export type { IDetectedWikilink, MarkdownRuleContext } from './rules/wikilink';

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

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    rules: manifest.rules,
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

    async detectConnections(
      filePath: string,
      content: string,
      _workspaceRoot: string
    ): Promise<IConnection[]> {
      return detectWikilink(content, filePath, { resolver });
    },
  };
}

export default createMarkdownPlugin;
