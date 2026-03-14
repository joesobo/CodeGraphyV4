import * as ts from 'typescript';

export function getScriptKind(fileName: string): ts.ScriptKind {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  switch (ext) {
    case '.tsx': return ts.ScriptKind.TSX;
    case '.ts': return ts.ScriptKind.TS;
    case '.jsx': return ts.ScriptKind.JSX;
    case '.js':
    case '.mjs':
    case '.cjs': return ts.ScriptKind.JS;
    default: return ts.ScriptKind.TS;
  }
}
