import { describe, expect, it } from 'vitest';
import {
  isFenceStart,
  parseWikilink,
  stripInlineCode,
} from '../src/rules/wikilinkHelpers';

describe('Markdown wikilink helpers', () => {
  it('detects fenced code markers with leading indentation', () => {
    expect(isFenceStart('   ```ts')).toBe(true);
    expect(isFenceStart('\t~~~')).toBe(true);
    expect(isFenceStart('text ```')).toBe(false);
  });

  it('strips inline code segments without inserting replacement text', () => {
    const stripped = stripInlineCode('Prefix `[[Ignored]]` Suffix');
    expect(stripped).toBe('Prefix  Suffix');
    expect(stripped).not.toContain('Stryker was here!');
  });

  it('parses wikilink target and alias with heading/whitespace normalization', () => {
    expect(parseWikilink('  Note Name  ')).toEqual({
      target: 'Note Name',
      alias: undefined,
      specifier: '[[Note Name]]',
    });

    expect(parseWikilink('  Note Name #Heading |  Alias Text  ')).toEqual({
      target: 'Note Name',
      alias: 'Alias Text',
      specifier: '[[Note Name|Alias Text]]',
    });
  });

  it('returns null when heading-only content has no target', () => {
    expect(parseWikilink('   #HeadingOnly  ')).toBeNull();
  });
});
