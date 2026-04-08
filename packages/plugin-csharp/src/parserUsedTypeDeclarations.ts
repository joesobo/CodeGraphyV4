import { collectTypesFromPattern } from './parserUsedTypeCollector';

function isCommonDeclarationNonProjectType(typeName: string): boolean {
  switch (typeName) {
    case 'String':
    case 'Object':
    case 'Boolean':
    case 'Int32':
    case 'Int64':
    case 'Double':
    case 'Decimal':
    case 'Byte':
    case 'Char':
    case 'Void':
      return true;
    default:
      return false;
  }
}

export function collectDeclarationTypes(content: string, typeSet: Set<string>): void {
  collectTypesFromPattern(
    content,
    /\b([A-Z][A-Za-z0-9_]*)\s+[a-z_][A-Za-z0-9_]*\s*[=;,)]/g,
    typeSet,
    typeName => !isCommonDeclarationNonProjectType(typeName),
  );
}
