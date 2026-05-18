import type { GDScriptStatement, IGDScriptReference } from './types';
import { parseGDScriptDocument } from './document';
import { extractGDScriptExtendsReference } from './resourceExtends';
import {
  extractGDScriptLoadReferences,
  extractStructuredGDScriptLoadReferences,
} from './resourceLoads';

function referenceKey(reference: IGDScriptReference): string {
  return JSON.stringify([
    reference.line,
    reference.referenceType,
    reference.resPath,
    reference.importType,
  ]);
}

function appendUniqueReference(
  references: IGDScriptReference[],
  seen: Set<string>,
  reference: IGDScriptReference,
): void {
  const key = referenceKey(reference);
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  references.push(reference);
}

function collectLoadReferences(
  content: string,
  statements: readonly GDScriptStatement[],
): IGDScriptReference[] {
  const structuredReferences = extractStructuredGDScriptLoadReferences(content);
  if (structuredReferences.length > 0) {
    return structuredReferences;
  }

  return statements.flatMap(extractGDScriptLoadReferences);
}

export function parseGDScriptResourceReferences(content: string): IGDScriptReference[] {
  const references: IGDScriptReference[] = [];
  const seen = new Set<string>();
  const document = parseGDScriptDocument(content);

  for (const reference of collectLoadReferences(content, document.statements)) {
    appendUniqueReference(references, seen, reference);
  }

  for (const statement of document.statements) {
    const extendsReference = extractGDScriptExtendsReference(statement);
    if (extendsReference) {
      appendUniqueReference(references, seen, extendsReference);
    }
  }

  return references.sort((left, right) => left.line - right.line);
}
