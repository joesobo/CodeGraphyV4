/**
 * @fileoverview Markdown plugin for CodeGraphy.
 * Detects [[wikilink]] connections between Markdown notes (Obsidian-style).
 * @module plugins/markdown
 */

import { IPlugin, IConnection } from '../../core/plugins';
import { ImportDetector } from './ImportDetector';
import { PathResolver } from './PathResolver';

export { ImportDetector } from './ImportDetector';
export type { IDetectedWikilink } from './ImportDetector';
export { PathResolver } from './PathResolver';

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
  const detector = new ImportDetector();
  const resolver = new PathResolver('');
  let resolverRoot = '';

  return {
    id: 'codegraphy.markdown',
    name: 'Markdown',
    version: '1.0.0',
    supportedExtensions: ['.md', '.mdx'],

    fileColors: {
      '.md': '#7C3AED',   // Purple — distinct from code files
      '.mdx': '#8B5CF6',  // Lighter purple for MDX
    },

    rules: [
      { id: 'wikilink', name: 'Wikilinks', description: '[[Note Name]], ![[embed]]' },
    ],

    async initialize(workspaceRoot: string): Promise<void> {
      resolverRoot = workspaceRoot;
      console.log('[CodeGraphy] Markdown plugin initialized');
    },

    async preAnalyze(
      files: Array<{ absolutePath: string; relativePath: string; content: string }>,
      workspaceRoot: string
    ): Promise<void> {
      // Rebuild index with current workspace root (handles refreshes)
      if (resolverRoot !== workspaceRoot) resolverRoot = workspaceRoot;
      // PathResolver needs the correct root — recreate if needed
      (resolver as unknown as { workspaceRoot: string }).workspaceRoot = workspaceRoot;
      resolver.buildIndex(files);
    },

    async detectConnections(
      filePath: string,
      content: string,
      _workspaceRoot: string
    ): Promise<IConnection[]> {
      const wikilinks = detector.detect(content, filePath);
      const connections: IConnection[] = [];

      for (const link of wikilinks) {
        const resolvedPath = resolver.resolve(link.target, filePath);
        connections.push({
          specifier: link.alias ? `[[${link.target}|${link.alias}]]` : `[[${link.target}]]`,
          resolvedPath,
          type: 'static',
          ruleId: 'wikilink',
        });
      }

      return connections;
    },

    dispose(): void {
      // nothing to clean up
    },
  };
}

export default createMarkdownPlugin;
