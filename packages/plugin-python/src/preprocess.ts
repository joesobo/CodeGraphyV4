/**
 * @fileoverview Shared preprocessing utilities for Python import detection.
 * Handles multi-line import joining, comment detection, and shared types.
 * Used by all Python rule modules.
 * @module plugins/python/preprocess
 */

import type { PathResolver } from './PathResolver';

/** Context provided by the Python plugin orchestrator to all rule detect functions */
export interface PythonRuleContext {
  resolver: PathResolver;
}

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
 * Checks if a line is a comment or docstring delimiter.
 */
export function isCommentOrString(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('#') || trimmed.startsWith('"""') || trimmed.startsWith("'''");
}
