import { describe, it, expect } from 'vitest';
import { isExternalNamespace } from '../src/pathResolverExternalNamespace';

describe('isExternalNamespace', () => {
  it.each([
    ['System'],
    ['Microsoft.Extensions.Logging'],
    ['Newtonsoft.Json'],
    ['NUnit.Framework'],
    ['Xunit.Abstractions'],
    ['Moq.Language'],
    ['AutoMapper.Configuration'],
    ['FluentValidation.Results'],
    ['Serilog.Events'],
    ['MediatR.Pipeline'],
    ['Dapper.SqlMapper'],
  ])('returns true for external namespace %s', namespace => {
    expect(isExternalNamespace(namespace)).toBe(true);
  });

  it('returns false for project namespaces', () => {
    expect(isExternalNamespace('MyApp.Services')).toBe(false);
    expect(isExternalNamespace('Company.Product.Feature')).toBe(false);
  });

  it('does not match prefixes inside longer words', () => {
    expect(isExternalNamespace('Systemic.Analysis')).toBe(false);
    expect(isExternalNamespace('Microsoftish.Tools')).toBe(false);
  });
});
