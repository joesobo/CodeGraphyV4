import type { IGDScriptReference } from './types';
import { parseGDScriptDocument } from './document';
import { extractGDScriptExtendsReference } from './resourceExtends';
import { extractGDScriptLoadReferences } from './resourceLoads';

export function parseGDScriptResourceReferences(content: string): IGDScriptReference[] {
  const references: IGDScriptReference[] = [];

  for (const statement of parseGDScriptDocument(content).statements) {
    const extendsReference = extractGDScriptExtendsReference(statement);
    if (extendsReference) {
      references.push(extendsReference);
    }
    references.push(...extractGDScriptLoadReferences(statement));
  }

  return references;
}
