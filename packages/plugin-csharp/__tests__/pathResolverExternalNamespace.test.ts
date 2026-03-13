import { describe, it, expect } from 'vitest';
import { isExternalNamespace } from '../src/pathResolverExternalNamespace';

describe('isExternalNamespace', () => {
  it('returns true for known framework namespaces', () => {
    expect(isExternalNamespace('System')).toBe(true);
    expect(isExternalNamespace('Microsoft.Extensions.Logging')).toBe(true);
    expect(isExternalNamespace('Newtonsoft.Json')).toBe(true);
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
