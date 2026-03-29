/**
 * @fileoverview File extension predicate helpers.
 * @module core/colors/extension/predicate
 */

/**
 * Checks if a pattern is a simple extension (e.g. '.ts') versus a filename or glob.
 */
export function isExtension(pattern: string): boolean {
  if (pattern.includes('*') || pattern.includes('/') || pattern.includes('\\')) {
    return false;
  }
  if (pattern.startsWith('.') && pattern.length > 1) {
    const afterDot = pattern.slice(1);
    if (!afterDot.includes('.') && afterDot.length <= 4) {
      return true;
    }
    return false;
  }
  return false;
}
