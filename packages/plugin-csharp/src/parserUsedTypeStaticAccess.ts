import { collectTypesFromPattern } from './parserUsedTypeCollector';

function isCommonStaticNonProjectType(typeName: string): boolean {
  switch (typeName) {
    case 'String':
    case 'Console':
    case 'Math':
    case 'Convert':
    case 'Guid':
    case 'DateTime':
    case 'TimeSpan':
    case 'Task':
    case 'File':
    case 'Path':
    case 'Directory':
    case 'Environment':
      return true;
    default:
      return false;
  }
}

export function collectStaticAccessTypes(content: string, typeSet: Set<string>): void {
  collectTypesFromPattern(content, /\b([A-Z][A-Za-z0-9_]*)\s*\.\s*[A-Za-z_]/g, typeSet, typeName => {
    return !isCommonStaticNonProjectType(typeName);
  });
}
