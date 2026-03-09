/**
 * @fileoverview Shared preprocessing utilities for Python import detection.
 * Handles multi-line import joining, line mapping, and comment detection.
 * Used by all Python rule modules.
 * @module plugins/python/preprocess
 */

/**
 * Preprocesses Python source to join multi-line imports within parentheses.
 * Combines lines like:
 * ```python
 * from typing import (
 *     List,
 *     Dict,
 * )
 * ```
 * into a single line for easier regex matching.
 */
export function preprocessMultilineImports(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check if this line starts an import with opening parenthesis
    if (
      /^(from\s+|import\s+).*\($/.test(line.trim()) ||
      /^(from\s+|import\s+).*\([^)]*$/.test(line.trim())
    ) {
      // Collect lines until closing parenthesis
      let combined = line;
      i++;
      while (i < lines.length && !combined.includes(')')) {
        combined += ' ' + lines[i].trim();
        i++;
      }
      // Remove parentheses and normalize whitespace
      combined = combined.replace(/\(\s*/g, '').replace(/\s*\)/g, '');
      result.push(combined);
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join('\n');
}

/**
 * Creates a mapping from processed line indices to original line numbers.
 */
export function createLineMapping(original: string, processed: string): number[] {
  const originalLines = original.split('\n');
  const processedLines = processed.split('\n');
  const mapping: number[] = [];

  let origIdx = 0;
  for (let procIdx = 0; procIdx < processedLines.length; procIdx++) {
    mapping.push(origIdx);

    // If this line was from a multi-line import, skip the consumed original lines
    const procLine = processedLines[procIdx];
    if (procLine.includes(',') && originalLines[origIdx]?.includes('(')) {
      // Count how many original lines this consumed
      while (origIdx < originalLines.length && !originalLines[origIdx].includes(')')) {
        origIdx++;
      }
    }
    origIdx++;
  }

  return mapping;
}

/**
 * Checks if a line is a comment or docstring delimiter.
 */
export function isCommentOrString(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('#') || trimmed.startsWith('"""') || trimmed.startsWith("'''");
}
