import ts from 'typescript';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { resolveVueScriptImport } from './resolver';

const SCRIPT_CALL_SOURCE_ID = 'sfc-script-call';

interface ImportedCallable {
  importedName: string;
  localName: string;
  resolvedPath: string;
  specifier: string;
}

export function extractScriptCalls(filePath: string, content: string): IAnalysisRelation[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const callables = collectImportedCallables(filePath, sourceFile);
  const relations: IAnalysisRelation[] = [];
  const seen = new Set<string>();

  collectCallRelations(sourceFile, filePath, callables, relations, seen);

  return relations;
}

function collectImportedCallables(filePath: string, sourceFile: ts.SourceFile): Map<string, ImportedCallable> {
  const callables = new Map<string, ImportedCallable>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly) {
      continue;
    }

    const specifier = readModuleSpecifier(statement.moduleSpecifier);
    if (!specifier) {
      continue;
    }

    const resolvedPath = resolveVueScriptImport(filePath, specifier);
    if (!resolvedPath) {
      continue;
    }

    collectImportClauseCallables(callables, statement.importClause, specifier, resolvedPath);
  }

  return callables;
}

function collectImportClauseCallables(
  callables: Map<string, ImportedCallable>,
  importClause: ts.ImportClause | undefined,
  specifier: string,
  resolvedPath: string,
): void {
  if (!importClause) {
    return;
  }

  if (importClause.name) {
    addImportedCallable(callables, importClause.name.text, importClause.name.text, specifier, resolvedPath);
  }

  const namedBindings = importClause.namedBindings;
  if (namedBindings && ts.isNamespaceImport(namedBindings)) {
    addImportedCallable(callables, namedBindings.name.text, namedBindings.name.text, specifier, resolvedPath);
    return;
  }

  if (!namedBindings) {
    return;
  }

  for (const element of namedBindings.elements) {
    addImportedCallable(
      callables,
      element.name.text,
      element.propertyName?.text ?? element.name.text,
      specifier,
      resolvedPath,
    );
  }
}

function collectCallRelations(
  node: ts.Node,
  filePath: string,
  callables: ReadonlyMap<string, ImportedCallable>,
  relations: IAnalysisRelation[],
  seen: Set<string>,
): void {
  if (ts.isCallExpression(node)) {
    const localName = readCalledLocalName(node.expression);
    const callable = localName ? callables.get(localName) : undefined;
    if (callable) {
      const key = `${callable.localName}:${callable.specifier}:${callable.resolvedPath}`;
      if (!seen.has(key)) {
        seen.add(key);
        relations.push({
          kind: 'call',
          sourceId: SCRIPT_CALL_SOURCE_ID,
          fromFilePath: filePath,
          toFilePath: callable.resolvedPath,
          resolvedPath: callable.resolvedPath,
          specifier: callable.specifier,
          metadata: {
            importedName: callable.importedName,
            localName: callable.localName,
          },
        });
      }
    }
  }

  ts.forEachChild(node, child => collectCallRelations(child, filePath, callables, relations, seen));
}

function readCalledLocalName(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
    return expression.expression.text;
  }

  return null;
}

function readModuleSpecifier(moduleSpecifier: ts.Expression): string | null {
  return ts.isStringLiteralLike(moduleSpecifier) ? moduleSpecifier.text : null;
}

function addImportedCallable(
  callables: Map<string, ImportedCallable>,
  localName: string,
  importedName: string,
  specifier: string,
  resolvedPath: string,
): void {
  callables.set(localName, {
    importedName,
    localName,
    specifier,
    resolvedPath,
  });
}
