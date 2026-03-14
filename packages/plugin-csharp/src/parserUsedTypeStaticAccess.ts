import { collectTypesFromPattern } from './parserUsedTypeCollector';

const COMMON_STATIC_NON_PROJECT_TYPES = new Set([
  'String',
  'Console',
  'Math',
  'Convert',
  'Guid',
  'DateTime',
  'TimeSpan',
  'Task',
  'File',
  'Path',
  'Directory',
  'Environment',
]);

export function collectStaticAccessTypes(content: string, typeSet: Set<string>): void {
  collectTypesFromPattern(content, /\b([A-Z][A-Za-z0-9_]*)\s*\.\s*[A-Za-z_]/g, typeSet, typeName => {
    return !COMMON_STATIC_NON_PROJECT_TYPES.has(typeName);
  });
}
