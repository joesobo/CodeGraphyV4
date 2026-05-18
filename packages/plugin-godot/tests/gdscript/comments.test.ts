import { describe, expect, it } from 'vitest';
import { stripGDScriptComment } from '../../src/gdscript/comments';

describe('stripGDScriptComment', () => {
  it('keeps leading whitespace when there is no comment', () => {
    expect(stripGDScriptComment('  var x = 1')).toBe('  var x = 1');
  });

  it('strips comments after a line that starts with a quoted string', () => {
    expect(stripGDScriptComment('"literal" # trailing comment')).toBe('"literal"');
  });

  it('keeps hash characters inside double-quoted strings', () => {
    expect(stripGDScriptComment('const Scene = preload("res://menu#v2.tscn") # comment'))
      .toBe('const Scene = preload("res://menu#v2.tscn")');
  });

  it('keeps hash characters inside single-quoted strings', () => {
    expect(stripGDScriptComment("const Scene = preload('res://menu#v2.tscn') # comment"))
      .toBe("const Scene = preload('res://menu#v2.tscn')");
  });

  it('keeps hash characters after escaped quotes inside strings', () => {
    expect(stripGDScriptComment('var text = "say \\"#not-comment\\"" # comment'))
      .toBe('var text = "say \\"#not-comment\\""');
  });

  it('keeps single quotes inside double-quoted strings', () => {
    expect(stripGDScriptComment('var text = "it\'s #not-comment" # comment'))
      .toBe('var text = "it\'s #not-comment"');
  });

  it('closes empty strings before trailing comments', () => {
    expect(stripGDScriptComment('var empty = "" # comment')).toBe('var empty = ""');
  });

  it('does not treat a backslash outside a string as a quote escape', () => {
    expect(stripGDScriptComment('var text = \\"#not-comment" # comment'))
      .toBe('var text = \\"#not-comment"');
  });

  it('treats a backslash outside a string as ordinary code', () => {
    expect(stripGDScriptComment('var path = res:\\\\folder # comment')).toBe('var path = res:\\\\folder');
  });
});
