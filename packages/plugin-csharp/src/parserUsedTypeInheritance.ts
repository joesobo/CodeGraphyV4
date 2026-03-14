import { collectTypesFromPattern } from './parserUsedTypeCollector';

export function collectInheritanceTypes(content: string, typeSet: Set<string>): void {
  collectTypesFromPattern(content, /:\s*([A-Z][A-Za-z0-9_]*)/g, typeSet);
}
