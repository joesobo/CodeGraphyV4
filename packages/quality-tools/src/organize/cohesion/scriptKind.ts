import * as ts from 'typescript';

/**
 * Determine the TypeScript script kind based on file extension.
 */
export function getScriptKind(fileName: string): ts.ScriptKind {
  if (fileName.endsWith('.jsx')) {
    return ts.ScriptKind.JSX;
  }
  if (fileName.endsWith('.js')) {
    return ts.ScriptKind.JS;
  }
  if (fileName.endsWith('.tsx')) {
    return ts.ScriptKind.TSX;
  }
  return ts.ScriptKind.TS;
}
