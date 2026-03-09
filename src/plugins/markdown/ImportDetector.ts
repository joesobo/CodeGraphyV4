/**
 * @fileoverview Markdown wikilink detection.
 * Detects [[wikilink]] and [[wikilink|alias]] syntax used by Obsidian and other
 * Markdown tools to express connections between notes.
 * @module plugins/markdown/ImportDetector
 */

/**
 * A detected wikilink from a Markdown file.
 */
export interface IDetectedWikilink {
  /** The link target as written, e.g. "My Note" or "folder/note" */
  target: string;
  /** Optional display alias, e.g. "alias" in [[target|alias]] */
  alias?: string;
  /** Line number (1-indexed) */
  line: number;
}

/**
 * Detects Obsidian-style wikilinks in Markdown content.
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
export class ImportDetector {
  // Matches [[target]] or [[target|alias]] or ![[target]] (embed)
  private static readonly WIKILINK_RE = /!?\[\[([^\]|#\n]+)(?:#[^\]|]*)?\|?[^\]]*\]\]/g;

  detect(content: string, _filePath: string): IDetectedWikilink[] {
    const results: IDetectedWikilink[] = [];
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

      ImportDetector.WIKILINK_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = ImportDetector.WIKILINK_RE.exec(stripped)) !== null) {
        const full = match[1].trim();
        // Split on | for alias
        const pipeIdx = full.indexOf('|');
        const target = pipeIdx === -1 ? full : full.slice(0, pipeIdx).trim();
        const alias = pipeIdx === -1 ? undefined : full.slice(pipeIdx + 1).trim() || undefined;
        if (target) {
          results.push({ target, alias, line: lineIdx + 1 });
        }
      }
    }

    return results;
  }
}
