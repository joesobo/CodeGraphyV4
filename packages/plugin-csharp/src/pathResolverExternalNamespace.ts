const EXTERNAL_NAMESPACE_PREFIXES = [
  'System',
  'Microsoft',
  'Newtonsoft',
  'NUnit',
  'Xunit',
  'Moq',
  'AutoMapper',
  'FluentValidation',
  'Serilog',
  'MediatR',
  'Dapper',
];

export function isExternalNamespace(namespace: string): boolean {
  return EXTERNAL_NAMESPACE_PREFIXES.some(prefix => {
    return namespace === prefix || namespace.startsWith(`${prefix}.`);
  });
}
