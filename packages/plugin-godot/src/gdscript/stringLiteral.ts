export function readQuotedStringLiteral(text: string | null): string | null {
  if (!text) {
    return null;
  }

  const quote = text[0];
  if ((quote !== '"' && quote !== "'") || text[text.length - 1] !== quote) {
    return null;
  }

  const value = text.slice(1, -1);
  if (value.includes('\n') || value.includes(quote)) {
    return null;
  }

  return value;
}
