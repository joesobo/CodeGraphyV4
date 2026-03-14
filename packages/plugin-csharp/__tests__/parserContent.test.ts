import { describe, it, expect } from 'vitest';
import { parseContent } from '../src/parserContent';

describe('parseContent', () => {
  it('parses declarations from lines with leading and trailing whitespace', () => {
    const parsed = parseContent('   using MyApp.Services;   \n   namespace MyApp.Features;   ');

    expect(parsed.usings).toHaveLength(1);
    expect(parsed.usings[0].namespace).toBe('MyApp.Services');
    expect(parsed.namespaces).toHaveLength(1);
    expect(parsed.namespaces[0].name).toBe('MyApp.Features');
  });

  it('ignores empty lines and comment-only lines', () => {
    const parsed = parseContent('\n   \n// using MyApp.Hidden;\n/* namespace MyApp.Hidden; */\n');

    expect(parsed.usings).toEqual([]);
    expect(parsed.namespaces).toEqual([]);
  });

  it('tracks multiline comment state across lines before parsing declarations', () => {
    const parsed = parseContent('/*\nusing MyApp.Hidden;\n*/\nusing MyApp.Visible;');

    expect(parsed.usings).toHaveLength(1);
    expect(parsed.usings[0].namespace).toBe('MyApp.Visible');
  });
});
