import { describe, it, expect } from 'vitest';
import { parseNamespaceDeclaration } from '../src/parseNamespaceDeclaration';

describe('parseNamespaceDeclaration', () => {
  it('parses file-scoped namespaces', () => {
    const result = parseNamespaceDeclaration('namespace MyApp.Features;');

    expect(result).toEqual({
      name: 'MyApp.Features',
      isFileScoped: true,
    });
  });

  it('parses block-scoped namespaces', () => {
    const result = parseNamespaceDeclaration('namespace MyApp.Features {');

    expect(result).toEqual({
      name: 'MyApp.Features',
      isFileScoped: false,
    });
  });

  it('returns null when no namespace declaration exists', () => {
    expect(parseNamespaceDeclaration('public class Program {}')).toBeNull();
  });

  it('supports extra spacing before delimiters for valid namespace lines', () => {
    const fileScoped = parseNamespaceDeclaration('namespace  MyApp.Features ;');
    const blockScoped = parseNamespaceDeclaration('namespace  MyApp.Features  {');

    expect(fileScoped).toEqual({ name: 'MyApp.Features', isFileScoped: true });
    expect(blockScoped).toEqual({ name: 'MyApp.Features', isFileScoped: false });
  });

  it('does not parse namespace tokens that appear later in a line', () => {
    expect(parseNamespaceDeclaration('public class Wrapper { namespace MyApp; }')).toBeNull();
  });

  it('does not parse trailing tokens after namespace declarations', () => {
    expect(parseNamespaceDeclaration('namespace MyApp.Features; extra')).toBeNull();
    expect(parseNamespaceDeclaration('namespace MyApp.Features { extra')).toBeNull();
  });

  it('supports trailing whitespace after delimiters', () => {
    expect(parseNamespaceDeclaration('namespace MyApp.Features;   ')).toEqual({
      name: 'MyApp.Features',
      isFileScoped: true,
    });
    expect(parseNamespaceDeclaration('namespace MyApp.Features {   ')).toEqual({
      name: 'MyApp.Features',
      isFileScoped: false,
    });
  });

  it('does not parse when namespace keyword appears after a prefix token', () => {
    expect(parseNamespaceDeclaration('prefix namespace MyApp.Features;')).toBeNull();
    expect(parseNamespaceDeclaration('prefix namespace MyApp.Features {')).toBeNull();
  });
});
