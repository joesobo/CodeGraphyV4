import * as ts from 'typescript';

export const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.slice(lastDot) : '';
}

export function isReExportStatement(statement: ts.Statement): boolean {
  if (ts.isExportDeclaration(statement)) {
    // export * from '...' or export { ... } from '...'
    if (statement.moduleSpecifier) {
      return true;
    }

    // export { ... } without from — only count as re-export if the exportClause exists
    // These are local re-exports of imported names
    if (
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause) &&
      statement.exportClause.elements.length > 0 &&
      !statement.moduleSpecifier
    ) {
      return true;
    }
  }

  return false;
}
