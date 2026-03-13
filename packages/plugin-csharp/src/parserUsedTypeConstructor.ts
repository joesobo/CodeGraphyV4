import { collectTypesFromPattern } from './parserUsedTypeCollector';

export function collectConstructorTypes(content: string, typeSet: Set<string>): void {
  collectTypesFromPattern(content, /\bnew\s+([A-Z][A-Za-z0-9_]*)\s*[(<]/g, typeSet);
}
