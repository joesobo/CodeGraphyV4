import * as ts from 'typescript';
import { type OrganizeFileIssue } from './organizeTypes';

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.slice(lastDot) : '';
}

function isReExportStatement(statement: ts.Statement): boolean {
  if (ts.isExportDeclaration(statement)) {
    // export * from '...' or export { ... } from '...'
    if (statement.moduleSpecifier) {
      return true;
    }

    // export { ... } without from — only count as re-export if the exportClause exists
    // These are local re-exports of imported names
    if (statement.exportClause && !statement.moduleSpecifier) {
      return true;
    }
  }

  return false;
}

export function checkBarrelFile(fileName: string, fileContent: string): OrganizeFileIssue | undefined {
  const ext = getFileExtension(fileName);

  // Only check supported file types
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return undefined;
  }

  // Parse the file
  const sourceFile = ts.createSourceFile(
    fileName,
    fileContent,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  // Count statements
  let totalStatements = 0;
  let reExportCount = 0;

  for (const statement of sourceFile.statements) {
    // Skip module declarations and other non-executable statements at the top level
    // but do count them for the total
    if (!ts.isModuleDeclaration(statement) && !ts.isNamespaceExport(statement)) {
      totalStatements++;
    }

    if (isReExportStatement(statement)) {
      reExportCount++;
    }
  }

  // Empty file is not a barrel
  if (totalStatements === 0) {
    return undefined;
  }

  // Calculate re-export ratio
  const reExportRatio = reExportCount / totalStatements;

  // Flag if 80% or more statements are re-exports
  if (reExportRatio >= 0.8) {
    const detail = `80% of statements are re-exports (${reExportCount} of ${totalStatements})`;
    return {
      detail,
      fileName,
      kind: 'barrel'
    };
  }

  return undefined;
}
