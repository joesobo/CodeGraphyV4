import ts from 'typescript';

export interface VueScriptImport {
  kind: 'import' | 'type-import';
  specifier: string;
}

export function extractScriptImports(filePath: string, content: string): VueScriptImport[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const imports: VueScriptImport[] = [];

  for (const statement of sourceFile.statements) {
    const importDeclaration = readImportDeclaration(statement);
    if (importDeclaration) {
      imports.push(importDeclaration);
      continue;
    }

    const importEquals = readImportEqualsDeclaration(statement);
    if (importEquals) {
      imports.push(importEquals);
    }
  }

  return imports;
}

function readImportDeclaration(statement: ts.Statement): VueScriptImport | null {
  if (!ts.isImportDeclaration(statement)) {
    return null;
  }

  const specifier = readModuleSpecifier(statement.moduleSpecifier);
  if (!specifier) {
    return null;
  }

  return {
    kind: statement.importClause?.isTypeOnly ? 'type-import' : 'import',
    specifier,
  };
}

function readImportEqualsDeclaration(statement: ts.Statement): VueScriptImport | null {
  if (!ts.isImportEqualsDeclaration(statement) || !ts.isExternalModuleReference(statement.moduleReference)) {
    return null;
  }

  const specifier = readModuleSpecifier(statement.moduleReference.expression);
  return specifier ? { kind: 'import', specifier } : null;
}

function readModuleSpecifier(moduleSpecifier: ts.Expression | undefined): string | null {
  return moduleSpecifier && ts.isStringLiteralLike(moduleSpecifier)
    ? moduleSpecifier.text
    : null;
}
