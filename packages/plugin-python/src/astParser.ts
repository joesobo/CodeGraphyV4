import { execFileSync } from 'child_process';

export type ParsedPythonImport =
  | {
      kind: 'import';
      module: string;
      line: number;
    }
  | {
      kind: 'from';
      module: string;
      names: string[];
      level: number;
      line: number;
    };

const PYTHON_AST_SCRIPT = String.raw`
import ast
import json
import sys

source = sys.stdin.read()

try:
    tree = ast.parse(source)
except SyntaxError:
    print("[]")
    raise SystemExit(0)

imports = []

for node in ast.walk(tree):
    if isinstance(node, ast.Import):
        for alias in node.names:
            imports.append({
                "kind": "import",
                "module": alias.name,
                "line": node.lineno,
            })
    elif isinstance(node, ast.ImportFrom):
        imports.append({
            "kind": "from",
            "module": node.module or "",
            "names": [alias.name for alias in node.names],
            "level": node.level or 0,
            "line": node.lineno,
        })

imports.sort(key=lambda item: item["line"])
print(json.dumps(imports))
`;

export function assertPythonAstRuntimeAvailable(): void {
  execFileSync('python3', ['-c', 'import ast, sys; print(sys.version_info[0])'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function parsePythonImports(content: string): ParsedPythonImport[] {
  const raw = execFileSync('python3', ['-c', PYTHON_AST_SCRIPT], {
    input: content,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];

  const imports: ParsedPythonImport[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const kind = rec.kind;
    const line = rec.line;

    if (kind !== 'import' && kind !== 'from') continue;
    if (typeof line !== 'number' || !Number.isFinite(line)) continue;

    if (kind === 'import') {
      const module = rec.module;
      if (typeof module !== 'string' || module.length === 0) continue;
      imports.push({ kind, module, line });
      continue;
    }

    const module = rec.module;
    const names = rec.names;
    const level = rec.level;
    if (typeof module !== 'string') continue;
    if (!Array.isArray(names) || !names.every(name => typeof name === 'string')) continue;
    if (typeof level !== 'number' || !Number.isInteger(level) || level < 0) continue;

    imports.push({ kind, module, names, level, line });
  }

  return imports;
}
