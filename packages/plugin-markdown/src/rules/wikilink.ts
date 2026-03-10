/**
 * @fileoverview Wikilink detection rule for Markdown files.
 * Detects [[wikilink]] and [[wikilink|alias]] syntax used by Obsidian and other
 * Markdown tools to express connections between notes.
 * @module plugins/markdown/rules/wikilink
 */

import type { IConnection, IRuleDetector } from '@codegraphy/plugin-api';
import type { PathResolver } from '../PathResolver';

/** Shared context for Markdown rules */
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
const WIKILINK_RE = /!?\[\[([^\]|#\n]+)(?:#[^\]|]*)?\|?[^\]]*\]\]/g;

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
): IConnection[] {
  const connections: IConnection[] = [];
  const lines = content.split('\n');
  let inFencedBlock = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    // Track fenced code blocks
    if (/^```|^~~~/.test(line.trimStart())) {
      inFencedBlock = !inFencedBlock;
      continue;
    }
    if (inFencedBlock) continue;

    // Strip inline code before matching
    const stripped = line.replace(/`[^`]*`/g, '');

    WIKILINK_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = WIKILINK_RE.exec(stripped)) !== null) {
      const full = match[1].trim();
      // Split on | for alias
      const pipeIdx = full.indexOf('|');
      const target = pipeIdx === -1 ? full : full.slice(0, pipeIdx).trim();
      const alias =
        pipeIdx === -1
          ? undefined
          : full.slice(pipeIdx + 1).trim() || undefined;

      if (target) {
        const resolvedPath = ctx.resolver.resolve(target, filePath);
        connections.push({
          specifier: alias
            ? `[[${target}|${alias}]]`
            : `[[${target}]]`,
          resolvedPath,
          type: 'static',
          ruleId: 'wikilink',
        });
      }
    }
  }

  return connections;
}

const rule: IRuleDetector<MarkdownRuleContext> = { id: 'wikilink', detect };
export default rule;
