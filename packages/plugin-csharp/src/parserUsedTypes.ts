import { stripCommentsAndLiteralsForTypeExtraction } from './parserTypeExtractionSanitizer';
import { collectConstructorTypes } from './parserUsedTypeConstructor';
import { collectDeclarationTypes } from './parserUsedTypeDeclarations';
import { collectGenericArgumentTypes } from './parserUsedTypeGenericArgs';
import { collectInheritanceTypes } from './parserUsedTypeInheritance';
import { collectStaticAccessTypes } from './parserUsedTypeStaticAccess';

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
