import { describe, it, expect } from 'vitest';
import { isExternalNamespace } from '../src/pathResolverExternalNamespace';

describe('isExternalNamespace', () => {
  it('returns true for every configured external namespace prefix', () => {
    expect(isExternalNamespace('System')).toBe(true);
    expect(isExternalNamespace('Microsoft.Extensions.Logging')).toBe(true);
    expect(isExternalNamespace('Newtonsoft.Json')).toBe(true);
    expect(isExternalNamespace('NUnit.Framework')).toBe(true);
    expect(isExternalNamespace('Xunit.Abstractions')).toBe(true);
    expect(isExternalNamespace('Moq.Language')).toBe(true);
    expect(isExternalNamespace('AutoMapper.Configuration')).toBe(true);
    expect(isExternalNamespace('FluentValidation.Results')).toBe(true);
    expect(isExternalNamespace('Serilog.Events')).toBe(true);
    expect(isExternalNamespace('MediatR.Pipeline')).toBe(true);
    expect(isExternalNamespace('Dapper.SqlMapper')).toBe(true);
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
