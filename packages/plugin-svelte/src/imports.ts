import ts from 'typescript';

export interface SvelteScriptImport {
  kind: 'import' | 'type-import';
  source: 'static' | 'dynamic';
  specifier: string;
}

export function extractScriptImports(filePath: string, content: string): SvelteScriptImport[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const imports: SvelteScriptImport[] = [];

  for (const statement of sourceFile.statements) {
    const importDeclaration = readImportDeclaration(statement);
    if (importDeclaration) {
      imports.push(importDeclaration);
    }

    const importEquals = readImportEqualsDeclaration(statement);
    if (importEquals) {
      imports.push(importEquals);
    }

    collectDynamicImports(statement, imports);
  }

  return imports;
}

function readImportDeclaration(statement: ts.Statement): SvelteScriptImport | null {
  if (!ts.isImportDeclaration(statement)) {
    return null;
  }

  const specifier = readModuleSpecifier(statement.moduleSpecifier);
  if (!specifier) {
    return null;
  }

  return {
    kind: statement.importClause?.isTypeOnly ? 'type-import' : 'import',
    source: 'static',
    specifier,
  };
}

function readImportEqualsDeclaration(statement: ts.Statement): SvelteScriptImport | null {
  if (!ts.isImportEqualsDeclaration(statement) || !ts.isExternalModuleReference(statement.moduleReference)) {
    return null;
  }

  const specifier = readModuleSpecifier(statement.moduleReference.expression);
  return specifier ? { kind: 'import', source: 'static', specifier } : null;
}

function readModuleSpecifier(moduleSpecifier: ts.Expression | undefined): string | null {
  return moduleSpecifier && ts.isStringLiteralLike(moduleSpecifier)
    ? moduleSpecifier.text
    : null;
}

function collectDynamicImports(node: ts.Node, imports: SvelteScriptImport[]): void {
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    const specifier = readModuleSpecifier(node.arguments[0]);
    if (specifier) {
      imports.push({ kind: 'import', source: 'dynamic', specifier });
    }
  }

  ts.forEachChild(node, child => collectDynamicImports(child, imports));
}
