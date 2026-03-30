import { stripExtension } from './stripExtension';

/**
 * Split a name (filename or folder name) into lowercase tokens.
 *
 * Rules:
 * - Strip known file extensions first (.ts, .tsx, .js, .jsx, .test.ts, .test.tsx, .spec.ts, .spec.tsx)
 * - Split on camelCase boundaries
 * - Split on PascalCase boundaries
 * - Handle acronyms correctly
 * - Split on kebab-case, underscores, and dots
 * - Return all tokens in lowercase
 * - Filter out empty strings
 * - Keep single-character tokens
 */
export function tokenize(name: string): string[] {
  // Strip known extensions
  const withoutExtension = stripExtension(name);

  // Replace separators with spaces for initial split
  const withSpaces = withoutExtension
    .replace(/[-_.]/g, ' ') // kebab, snake, dots
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase: lowercase followed by uppercase
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // Acronyms: multiple capitals followed by capital+lowercase
    .replace(/([a-zA-Z])(\d)/g, '$1 $2') // Letter followed by digit
    .replace(/(\d)([a-zA-Z])/g, '$1 $2'); // Digit followed by letter

  // Split on whitespace and filter empty strings
  const tokens = withSpaces
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token) => token.toLowerCase());

  return tokens;
}
