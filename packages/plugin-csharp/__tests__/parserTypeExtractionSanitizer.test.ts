import { describe, it, expect } from 'vitest';
import { stripCommentsAndLiteralsForTypeExtraction } from '../src/parserTypeExtractionSanitizer';

describe('stripCommentsAndLiteralsForTypeExtraction', () => {
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
