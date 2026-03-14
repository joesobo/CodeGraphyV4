import { stripCommentsAndLiteralsForTypeExtraction } from './parserComments';
import {
  collectConstructorTypes,
  collectDeclarationTypes,
  collectGenericArgumentTypes,
  collectInheritanceTypes,
  collectStaticAccessTypes,
} from './parserUsedTypePatterns';

export function extractUsedTypes(content: string): Set<string> {
  const types = new Set<string>();
  const sanitizedContent = stripCommentsAndLiteralsForTypeExtraction(content);

  collectConstructorTypes(sanitizedContent, types);
  collectStaticAccessTypes(sanitizedContent, types);
  collectInheritanceTypes(sanitizedContent, types);
  collectGenericArgumentTypes(sanitizedContent, types);
  collectDeclarationTypes(sanitizedContent, types);

  return types;
}
