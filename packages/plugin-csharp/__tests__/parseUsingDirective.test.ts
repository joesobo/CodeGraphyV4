import { describe, it, expect } from 'vitest';
import { parseUsingDirective } from '../src/parseUsingDirective';

describe('parseUsingDirective', () => {
  it('parses a standard using directive', () => {
    const result = parseUsingDirective('using MyApp.Services;');

    expect(result).toEqual({
      namespace: 'MyApp.Services',
      alias: undefined,
      isStatic: false,
      isGlobal: false,
    });
  });

  it('parses global static using directives', () => {
    const result = parseUsingDirective('global using static MyApp.Math;');

    expect(result).toEqual({
      namespace: 'MyApp.Math',
      alias: undefined,
      isStatic: true,
      isGlobal: true,
    });
  });

  it('parses using aliases', () => {
    const result = parseUsingDirective('using Json = MyCompany.Serialization.Json;');

    expect(result).toEqual({
      namespace: 'MyCompany.Serialization.Json',
      alias: 'Json',
      isStatic: false,
      isGlobal: false,
    });
  });

  it('returns null for non-using content', () => {
    expect(parseUsingDirective('namespace MyApp;')).toBeNull();
  });

  it('allows extra spacing variants accepted by the parser grammar', () => {
    const withExtraGlobalSpacing = parseUsingDirective('global  using MyApp.Core;');
    const withExtraStaticSpacing = parseUsingDirective('using static  MyApp.Math;');
    const aliasWithoutSpaceAroundEquals = parseUsingDirective('using Json=MyCompany.Serialization.Json;');
    const namespaceWithSpaceBeforeSemicolon = parseUsingDirective('using MyApp.Services ;');

    expect(withExtraGlobalSpacing?.namespace).toBe('MyApp.Core');
    expect(withExtraStaticSpacing?.namespace).toBe('MyApp.Math');
    expect(aliasWithoutSpaceAroundEquals?.alias).toBe('Json');
    expect(namespaceWithSpaceBeforeSemicolon?.namespace).toBe('MyApp.Services');
  });

  it('does not parse when using keyword is not at start of line', () => {
    expect(parseUsingDirective('x using MyApp.Services;')).toBeNull();
  });

  it('does not parse trailing tokens after a semicolon-terminated using', () => {
    expect(parseUsingDirective('using MyApp.Services; extra')).toBeNull();
  });
});
