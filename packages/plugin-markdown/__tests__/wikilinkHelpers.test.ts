import { describe, expect, it } from 'vitest';
import {
  isFenceStart,
  parseWikilink,
  stripInlineCode,
} from '../src/rules/wikilinkHelpers';

describe('isFenceStart', () => {
  it('returns true for a backtick fence', () => {
    const line = '```ts';

    const result = isFenceStart(line);

    expect(result).toBe(true);
  });

  it('returns true for a tilde fence', () => {
    const line = '~~~';

    const result = isFenceStart(line);

    expect(result).toBe(true);
  });

  it('returns true for a fence with leading spaces', () => {
    const line = '   ```ts';

    const result = isFenceStart(line);

    expect(result).toBe(true);
  });

  it('returns true for a fence with leading tab', () => {
    const line = '\t~~~';

    const result = isFenceStart(line);

    expect(result).toBe(true);
  });

  it('returns false when fence markers appear mid-line', () => {
    const line = 'text ```';

    const result = isFenceStart(line);

    expect(result).toBe(false);
  });

  it('returns false for a plain text line', () => {
    const line = 'no fence here';

    const result = isFenceStart(line);

    expect(result).toBe(false);
  });
});

describe('stripInlineCode', () => {
  it('removes a single inline code segment', () => {
    const line = 'Prefix `[[Ignored]]` Suffix';

    const result = stripInlineCode(line);

    expect(result).toBe('Prefix  Suffix');
  });

  it('does not insert replacement text into the result', () => {
    const line = 'Prefix `code` Suffix';

    const result = stripInlineCode(line);

    expect(result).not.toContain('Stryker was here!');
  });

  it('removes multiple inline code segments', () => {
    const line = '`first` middle `second` end';

    const result = stripInlineCode(line);

    expect(result).toBe(' middle  end');
  });

  it('returns the line unchanged when no inline code is present', () => {
    const line = 'no inline code here';

    const result = stripInlineCode(line);

    expect(result).toBe('no inline code here');
  });
});

describe('parseWikilink', () => {
  it('parses a simple target', () => {
    const inner = 'Note Name';

    const result = parseWikilink(inner);

    expect(result).toEqual({
      target: 'Note Name',
      alias: undefined,
      specifier: '[[Note Name]]',
    });
  });

  it('trims whitespace around the target', () => {
    const inner = '  Note Name  ';

    const result = parseWikilink(inner);

    expect(result).toEqual({
      target: 'Note Name',
      alias: undefined,
      specifier: '[[Note Name]]',
    });
  });

  it('parses a target with an alias', () => {
    const inner = 'Note Name|Alias Text';

    const result = parseWikilink(inner);

    expect(result).toEqual({
      target: 'Note Name',
      alias: 'Alias Text',
      specifier: '[[Note Name|Alias Text]]',
    });
  });

  it('trims whitespace around both target and alias', () => {
    const inner = '  Note Name  |  Alias Text  ';

    const result = parseWikilink(inner);

    expect(result).toEqual({
      target: 'Note Name',
      alias: 'Alias Text',
      specifier: '[[Note Name|Alias Text]]',
    });
  });

  it('strips the heading from the target', () => {
    const inner = 'Note Name#Heading';

    const result = parseWikilink(inner);

    expect(result).toEqual({
      target: 'Note Name',
      alias: undefined,
      specifier: '[[Note Name]]',
    });
  });

  it('strips the heading and parses the alias', () => {
    const inner = '  Note Name #Heading |  Alias Text  ';

    const result = parseWikilink(inner);

    expect(result).toEqual({
      target: 'Note Name',
      alias: 'Alias Text',
      specifier: '[[Note Name|Alias Text]]',
    });
  });

  it('returns null when the input is heading-only', () => {
    const inner = '   #HeadingOnly  ';

    const result = parseWikilink(inner);

    expect(result).toBeNull();
  });

  it('returns null for an empty string', () => {
    const inner = '';

    const result = parseWikilink(inner);

    expect(result).toBeNull();
  });

  it('returns null for whitespace-only input', () => {
    const inner = '   ';

    const result = parseWikilink(inner);

    expect(result).toBeNull();
  });

  it('sets alias to undefined when pipe is present but alias is empty', () => {
    const inner = 'Note Name|';

    const result = parseWikilink(inner);

    expect(result).toEqual({
      target: 'Note Name',
      alias: undefined,
      specifier: '[[Note Name]]',
    });
  });
});
