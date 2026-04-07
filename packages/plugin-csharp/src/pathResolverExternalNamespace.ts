export function isExternalNamespace(namespace: string): boolean {
  switch (namespace.split('.')[0]) {
    case 'System':
    case 'Microsoft':
    case 'Newtonsoft':
    case 'NUnit':
    case 'Xunit':
    case 'Moq':
    case 'AutoMapper':
    case 'FluentValidation':
    case 'Serilog':
    case 'MediatR':
    case 'Dapper':
      return true;
    default:
      return false;
  }
}
