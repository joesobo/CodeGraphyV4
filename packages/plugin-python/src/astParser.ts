import { execFileSync } from 'child_process';
import { parsePythonImportsFromRaw } from './astParserResult';
import { normalizeParsedImport } from './astParserNormalize';
import type { ParsedPythonImport } from './pythonImportTypes';

export type { ParsedPythonImport } from './pythonImportTypes';

const AST_SCRIPT_BASE64 =
  'aW1wb3J0IGFzdCwganNvbiwgc3lzCnNvdXJjZSA9IHN5cy5zdGRpbi5yZWFkKCkKdHJ5OgogICAgdHJlZSA9IGFzdC5wYXJzZShzb3VyY2UpCmV4Y2VwdCBTeW50YXhFcnJvcjoKICAgIHByaW50KCdbXScpCiAgICByYWlzZSBTeXN0ZW1FeGl0KDApCmltcG9ydHMgPSBbXQpmb3Igbm9kZSBpbiBhc3Qud2Fsayh0cmVlKToKICAgIGlmIGlzaW5zdGFuY2Uobm9kZSwgYXN0LkltcG9ydCk6CiAgICAgICAgZm9yIGFsaWFzIGluIG5vZGUubmFtZXM6CiAgICAgICAgICAgIGltcG9ydHMuYXBwZW5kKHsna2luZCc6ICdpbXBvcnQnLCAnbW9kdWxlJzogYWxpYXMubmFtZSwgJ2xpbmUnOiBub2RlLmxpbmVub30pCiAgICBlbGlmIGlzaW5zdGFuY2Uobm9kZSwgYXN0LkltcG9ydEZyb20pOgogICAgICAgIGltcG9ydHMuYXBwZW5kKHsna2luZCc6ICdmcm9tJywgJ21vZHVsZSc6IG5vZGUubW9kdWxlIG9yICcnLCAnbmFtZXMnOiBbYWxpYXMubmFtZSBmb3IgYWxpYXMgaW4gbm9kZS5uYW1lc10sICdsZXZlbCc6IG5vZGUubGV2ZWwgb3IgMCwgJ2xpbmUnOiBub2RlLmxpbmVub30pCnByaW50KGpzb24uZHVtcHMoc29ydGVkKGltcG9ydHMsIGtleT1sYW1iZGEgaXRlbTogaXRlbVsnbGluZSddKSkpCg==';

const PYTHON_AST_SCRIPT = Buffer.from(AST_SCRIPT_BASE64, 'base64').toString('utf8');
const AST_PARSE_BUFFER_BYTES = 1024 * 1024 * 10;

export function assertPythonAstRuntimeAvailable(): void {
  execFileSync('python3', ['-c', 'import ast, sys; print(sys.version_info[0])']);
}

export function parsePythonImports(content: string): ParsedPythonImport[] {
  const raw = execFileSync('python3', ['-c', PYTHON_AST_SCRIPT], {
    input: content,
    maxBuffer: AST_PARSE_BUFFER_BYTES,
  });

  return parsePythonImportsFromRaw(raw.toString('utf8'));
}

export const __test = {
  normalizeParsedImport,
  parsePythonImportsFromRaw,
  PYTHON_AST_SCRIPT,
};
