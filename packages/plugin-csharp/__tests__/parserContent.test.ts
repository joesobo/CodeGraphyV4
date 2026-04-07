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

  it('skips comment-stripped blank lines and still records later namespace declarations', () => {
    const parsed = parseContent('using MyApp.Services;\n/* hidden namespace */\nnamespace MyApp.Features;');

    expect(parsed).toEqual({
      usings: [
        {
          namespace: 'MyApp.Services',
          isStatic: false,
          isGlobal: false,
          line: 1,
        },
      ],
      namespaces: [
        {
          name: 'MyApp.Features',
          isFileScoped: true,
          line: 3,
        },
      ],
    });
  });

  it('does not record namespaces for non-empty lines that are not namespace declarations', () => {
    const parsed = parseContent('public class FeatureService {}\nnamespace MyApp.Features;');

    expect(parsed.namespaces).toEqual([
      {
        name: 'MyApp.Features',
        isFileScoped: true,
        line: 2,
      },
    ]);
  });
});
