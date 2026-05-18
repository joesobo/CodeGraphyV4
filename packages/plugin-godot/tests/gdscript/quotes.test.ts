import { describe, expect, it } from 'vitest';
import {
  isGDScriptQuote,
  nextGDScriptQuote,
  shouldToggleGDScriptQuote,
} from '../../src/gdscript/quotes';

describe('GDScript quote helpers', () => {
  it('recognizes single and double quote characters', () => {
    expect(isGDScriptQuote('"')).toBe(true);
    expect(isGDScriptQuote("'")).toBe(true);
    expect(isGDScriptQuote('x')).toBe(false);
  });

  it('allows opening quotes and matching closing quotes only', () => {
    expect(shouldToggleGDScriptQuote(null, '"')).toBe(true);
    expect(shouldToggleGDScriptQuote('"', '"')).toBe(true);
    expect(shouldToggleGDScriptQuote('"', "'")).toBe(false);
    expect(shouldToggleGDScriptQuote("'", '"')).toBe(false);
    expect(shouldToggleGDScriptQuote(null, 'x')).toBe(false);
  });

  it('opens and closes the active quote', () => {
    expect(nextGDScriptQuote(null, '"')).toBe('"');
    expect(nextGDScriptQuote('"', '"')).toBeNull();
    expect(nextGDScriptQuote(null, "'")).toBe("'");
    expect(nextGDScriptQuote("'", "'")).toBeNull();
  });
});
