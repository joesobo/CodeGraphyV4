import * as ts from 'typescript';
import { type OrganizeFileIssue } from '../types';
import { SUPPORTED_EXTENSIONS, getFileExtension, isReExportStatement } from './reExport';

function scriptKindForExtension(ext: string): ts.ScriptKind {
  if (ext === '.tsx') {
    return ts.ScriptKind.TSX;
  }
  if (ext === '.jsx') {
    return ts.ScriptKind.JSX;
  }
  if (ext === '.js') {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
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
    scriptKindForExtension(ext)
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

  const reExportRatio = totalStatements > 0 ? reExportCount / totalStatements : 0;

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
