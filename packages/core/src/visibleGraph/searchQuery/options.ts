import type { VisibleGraphSearchOptions } from '../contracts';

export type NormalizedSearchOptions = Required<VisibleGraphSearchOptions>;

export interface CompiledSearchPattern {
  pattern: RegExp | null;
  regexError: string | null;
}

export function normalizeSearchOptions(
  options: VisibleGraphSearchOptions | undefined,
): NormalizedSearchOptions {
  return {
    matchCase: options?.matchCase ?? false,
    wholeWord: options?.wholeWord ?? false,
    regex: options?.regex ?? false,
  };
}

export function compileSearchPattern(
  query: string,
  options: NormalizedSearchOptions,
): CompiledSearchPattern {
  if (options.regex) {
    return compileRegexSearchPattern(query, options);
  }

  if (options.wholeWord) {
    return compileWholeWordSearchPattern(query, options);
  }

  return { pattern: null, regexError: null };
}

function compileRegexSearchPattern(
  query: string,
  options: Pick<NormalizedSearchOptions, 'matchCase'>,
): CompiledSearchPattern {
  try {
    return { pattern: new RegExp(query, getRegexFlags(options)), regexError: null };
  } catch (error) {
    return {
      pattern: null,
      regexError: error instanceof Error ? error.message : 'Invalid regex',
    };
  }
}

function compileWholeWordSearchPattern(
  query: string,
  options: Pick<NormalizedSearchOptions, 'matchCase'>,
): CompiledSearchPattern {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { pattern: new RegExp(`\\b${escaped}\\b`, getRegexFlags(options)), regexError: null };
}

function getRegexFlags(options: Pick<NormalizedSearchOptions, 'matchCase'>): string {
  return options.matchCase ? '' : 'i';
}
