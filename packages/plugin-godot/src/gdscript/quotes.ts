export type GDScriptQuote = '"' | "'";

export function isGDScriptQuote(character: string): character is GDScriptQuote {
  return character === '"' || character === "'";
}

export function shouldToggleGDScriptQuote(
  activeQuote: GDScriptQuote | null,
  character: string,
): character is GDScriptQuote {
  return isGDScriptQuote(character) && (activeQuote === null || activeQuote === character);
}

export function nextGDScriptQuote(
  activeQuote: GDScriptQuote | null,
  character: GDScriptQuote,
): GDScriptQuote | null {
  return activeQuote === null ? character : null;
}
