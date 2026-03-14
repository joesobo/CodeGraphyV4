import { describe, it, expect } from 'vitest';
import { stripCommentsAndLiteralsForTypeExtraction } from '../src/parserTypeExtractionSanitizer';

describe('stripCommentsAndLiteralsForTypeExtraction', () => {
  it('removes block comment sections exactly', () => {
    const sanitized = stripCommentsAndLiteralsForTypeExtraction('before /* hidden */ after');

    expect(sanitized).toBe('before  after');
  });

  it('removes single-line comments exactly', () => {
    const sanitized = stripCommentsAndLiteralsForTypeExtraction('var x = 1; // remove me');

    expect(sanitized).toBe('var x = 1; ');
  });

  it('removes regular string literals exactly', () => {
    const sanitized = stripCommentsAndLiteralsForTypeExtraction('var x = "hello"; var y = 1;');

    expect(sanitized).toBe('var x = ; var y = 1;');
  });

  it('removes verbatim string literals exactly', () => {
    const sanitized = stripCommentsAndLiteralsForTypeExtraction('var path = @"C:\\Temp\\File"; var y = 1;');

    expect(sanitized).toBe('var path = ; var y = 1;');
  });

  it('removes character literals exactly', () => {
    const sanitized = stripCommentsAndLiteralsForTypeExtraction("var marker = 'A'; var y = 1;");

    expect(sanitized).toBe('var marker = ; var y = 1;');
  });

  it('removes comments and literal values while keeping code tokens', () => {
    const input = `
// new FakeFromComment()
/* BaseType and FakeBlock */
var text = "new FakeFromString()";
var path = @"C:\\Temp\\FakeFromVerbatim";
var marker = 'F';
var instance = new RealType();
`;

    const sanitized = stripCommentsAndLiteralsForTypeExtraction(input);

    expect(sanitized).not.toContain('FakeFromComment');
    expect(sanitized).not.toContain('FakeBlock');
    expect(sanitized).not.toContain('FakeFromString');
    expect(sanitized).not.toContain('FakeFromVerbatim');
    expect(sanitized).not.toContain('Stryker was here!');
    expect(sanitized).not.toContain("'F'");
    expect(sanitized).toContain('new RealType()');
  });

  it('handles escaped quotes in regular strings', () => {
    const input = 'var text = "escaped \\"quote\\" and FakeType"; var service = new RealService();';

    const sanitized = stripCommentsAndLiteralsForTypeExtraction(input);

    expect(sanitized).not.toContain('FakeType');
    expect(sanitized).toContain('RealService');
  });
});
