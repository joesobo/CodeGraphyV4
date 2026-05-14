import { nextGDScriptQuote, shouldToggleGDScriptQuote, type GDScriptQuote } from './quotes';

export function stripGDScriptComment(line: string): string {
  let escaped = false;
  let quote: GDScriptQuote | null = null;
  let index = -1;

  for (const character of line) {
    index += 1;

    if (escaped) {
      escaped = false;
      continue;
    }

    if (quote !== null && character === '\\') {
      escaped = true;
      continue;
    }

    if (shouldToggleGDScriptQuote(quote, character)) {
      quote = nextGDScriptQuote(quote, character);
      continue;
    }

    if (character === '#' && quote === null) {
      return line.slice(0, index).trimEnd();
    }
  }

  return line.trimEnd();
}
