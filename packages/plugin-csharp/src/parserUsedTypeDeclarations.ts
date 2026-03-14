import { collectTypesFromPattern } from './parserUsedTypeCollector';

const COMMON_DECLARATION_NON_PROJECT_TYPES = new Set([
  'String',
  'Object',
  'Boolean',
  'Int32',
  'Int64',
  'Double',
  'Decimal',
  'Byte',
  'Char',
  'Void',
]);

export function collectDeclarationTypes(content: string, typeSet: Set<string>): void {
  collectTypesFromPattern(
    content,
    /\b([A-Z][A-Za-z0-9_]*)\s+[a-z_][A-Za-z0-9_]*\s*[=;,)]/g,
    typeSet,
    typeName => !COMMON_DECLARATION_NON_PROJECT_TYPES.has(typeName),
  );
}
