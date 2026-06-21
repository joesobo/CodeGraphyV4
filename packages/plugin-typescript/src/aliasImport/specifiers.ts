import ts from 'typescript';

export function extractModuleSpecifiers(filePath: string, content: string): string[] {
  const sourceFile = createSourceFile(filePath, content);
  const specifiers: string[] = [];

  function visit(node: ts.Node): void {
    const specifier = readModuleSpecifier(node);
    if (specifier) {
      specifiers.push(specifier);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function createSourceFile(filePath: string, content: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
  );
}

function readModuleSpecifier(node: ts.Node): string | null {
  return readStaticModuleSpecifier(node)
    ?? readImportEqualsSpecifier(node)
    ?? readDynamicImportSpecifier(node);
}

function readStaticModuleSpecifier(node: ts.Node): string | null {
  if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) {
    return null;
  }

  return readStringLiteralText(node.moduleSpecifier);
}

function readImportEqualsSpecifier(node: ts.Node): string | null {
  if (!ts.isImportEqualsDeclaration(node) || !ts.isExternalModuleReference(node.moduleReference)) {
    return null;
  }

  return readStringLiteralText(node.moduleReference.expression);
}

function readDynamicImportSpecifier(node: ts.Node): string | null {
  if (!ts.isCallExpression(node) || node.expression.kind !== ts.SyntaxKind.ImportKeyword) {
    return null;
  }

  return readStringLiteralText(node.arguments[0]);
}

function readStringLiteralText(moduleSpecifier: ts.Expression | undefined): string | null {
  return moduleSpecifier && ts.isStringLiteralLike(moduleSpecifier)
    ? moduleSpecifier.text
    : null;
}
