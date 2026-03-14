import { describe, it, expect } from 'vitest';
import { stripCommentsFromLine, type LineParseState } from '../src/parserLineCommentStripper';

describe('stripCommentsFromLine', () => {
  function createState(inMultiLineComment: boolean): LineParseState {
    return { inMultiLineComment };
  }

  it('removes single line comments', () => {
    const result = stripCommentsFromLine('using MyApp; // trailing comment', createState(false));

    expect(result.code).toBe('using MyApp; ');
    expect(result.state).toEqual({ inMultiLineComment: false });
  });

  it('removes inline block comments', () => {
    const result = stripCommentsFromLine('using /*noise*/ MyApp.Services;', createState(false));

    expect(result.code).toBe('using  MyApp.Services;');
    expect(result.state).toEqual({ inMultiLineComment: false });
  });

  it('keeps parser in multiline mode when end marker is missing', () => {
    const result = stripCommentsFromLine('/* open comment', createState(false));

    expect(result.code).toBe('');
    expect(result.state).toEqual({ inMultiLineComment: true });
  });

  it('consumes existing multiline state and resumes parsing after closing marker', () => {
    const result = stripCommentsFromLine('still comment */ using MyApp.Services;', createState(true));

    expect(result.code).toBe(' using MyApp.Services;');
    expect(result.state).toEqual({ inMultiLineComment: false });
  });

  it('returns empty code when multiline state continues across line', () => {
    const result = stripCommentsFromLine('still comment only', createState(true));

    expect(result.code).toBe('');
    expect(result.state).toEqual({ inMultiLineComment: true });
  });
});
