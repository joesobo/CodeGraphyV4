/**
 * @fileoverview Wikilink detection rule for Markdown files.
 * Detects [[wikilink]] and [[wikilink|alias]] syntax used by Obsidian and other
 * Markdown tools to express connections between notes.
 * @module plugins/markdown/sources/wikilink
 */

import type { IAnalysisRelation } from '@codegraphy-vscode/plugin-api';
import type { PathResolver } from '../PathResolver';
import {
  isFenceStart,
  parseWikilink,
  stripInlineCode,
} from './wikilinkHelpers';

/** Shared context for Markdown sources */
export interface MarkdownRuleContext {
  resolver: PathResolver;
}

/** Represents a detected wikilink */
export interface IDetectedWikilink {
  /** The link target as written, e.g. "My Note" or "folder/note" */
  target: string;
  /** Optional display alias, e.g. "alias" in [[target|alias]] */
  alias?: string;
  /** Line number (1-indexed) */
  line: number;
}

// Matches [[target]] or [[target|alias]] or ![[target]] (embed)
const WIKILINK_RE = /!?\[\[([^\]\n]+)\]\]/g;

/**
 * Detects Obsidian-style [[wikilinks]] in Markdown files.
 *
 * Supported syntax:
 * - `[[Note Name]]` — basic wikilink
 * - `[[Note Name|Alias]]` — wikilink with display alias
 * - `[[folder/Note Name]]` — wikilink with path
 * - `[[Note Name#heading]]` — wikilink to heading (heading stripped for resolution)
 * - `![[Note Name]]` — embedded wikilink (treated same as regular link)
 *
 * Does NOT match:
 * - Links inside code blocks (``` or ~~~)
 * - Links inside inline code (`...`)
 */
export function detect(
  content: string,
  filePath: string,
  ctx: MarkdownRuleContext
): IAnalysisRelation[] {
  const relations: IAnalysisRelation[] = [];
  const lines = content.split('\n');
  let inFencedBlock = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    // Track fenced code blocks
    if (isFenceStart(line)) {
      inFencedBlock = !inFencedBlock;
      continue;
    }
    if (inFencedBlock) continue;

    // Strip inline code before matching
    const stripped = stripInlineCode(line);

    WIKILINK_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = WIKILINK_RE.exec(stripped)) !== null) {
      const parsed = parseWikilink(match[1]);
      if (!parsed) continue;

      const resolvedPath = ctx.resolver.resolve(parsed.target, filePath);
      relations.push({
        kind: 'reference',
        specifier: parsed.specifier,
        resolvedPath,
        fromFilePath: filePath,
        toFilePath: resolvedPath,
        type: 'static',
        sourceId: 'wikilink',
      });
    }
  }

  return relations;
}

const rule = { id: 'wikilink', detect };
export default rule;
