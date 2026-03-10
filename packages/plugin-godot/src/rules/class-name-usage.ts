/**
 * @fileoverview Class name usage detection rule for GDScript.
 * Detects references to class names defined via `class_name` in other files:
 * - extends ClassName (unquoted)
 * - var x: ClassName (type annotation)
 * - func f() -> ClassName (return type)
 * - ClassName.something (static access)
 * - x is ClassName, x as ClassName (type check/cast)
 * - Array[ClassName] (generic type)
 * @module plugins/godot/rules/class-name-usage
 */

import * as path from 'path';
import type { IConnection, IRuleDetector } from '@codegraphy/plugin-api';
import type { GDScriptRuleContext, IGDScriptReference } from '../parser';

/**
 * Detects class_name usage patterns in GDScript content.
 * Only identifiers starting with uppercase are considered, matching GDScript convention.
 * The resolver discards any name not in its class_name map.
 */
export function detect(content: string, _filePath: string, ctx: GDScriptRuleContext): IConnection[] {
  const connections: IConnection[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const lineWithoutComment = lines[i].split('#')[0];
    if (!lineWithoutComment.trim()) continue;

    const usages = detectUsagesInLine(lineWithoutComment, i + 1);
    for (const ref of usages) {
      const resolved = ctx.resolver.resolve(ref.resPath, ctx.relativeFilePath);
      if (resolved) {
        connections.push({
          specifier: ref.resPath,
          resolvedPath: path.join(ctx.workspaceRoot, resolved).replace(/\\/g, '/'),
          type: 'static',
          ruleId: 'class-name-usage',
        });
      }
      // Unresolved class_name_usage = built-in Godot type or false positive, discard
    }
  }

  return connections;
}

/**
 * Detect potential class_name usages in a single line.
 * Exported for direct testing.
 */
export function detectUsagesInLine(line: string, lineNumber: number): IGDScriptReference[] {
  const references: IGDScriptReference[] = [];
  const seen = new Set<string>();

  const push = (name: string) => {
    if (!seen.has(name)) {
      seen.add(name);
      references.push({
        resPath: name,
        referenceType: 'class_name_usage',
        importType: 'static',
        line: lineNumber,
        isDeclaration: false,
      });
    }
  };

  const trimmed = line.trim();

  // extends ClassName (no quotes -- class_name-based inheritance)
  const extendsMatch = trimmed.match(/^extends\s+([A-Z]\w*)\s*(?:#.*)?$/);
  if (extendsMatch) push(extendsMatch[1]);

  // Type annotations: var/const/@export var/@onready var name: ClassName
  // Also catches function parameters: func f(p: ClassName)
  const typeAnnotationRegex = /\w+\s*:\s*([A-Z]\w*)/g;
  let match;
  while ((match = typeAnnotationRegex.exec(line)) !== null) push(match[1]);

  // Return type: -> ClassName
  const returnTypeMatch = line.match(/->\s*([A-Z]\w*)/);
  if (returnTypeMatch) push(returnTypeMatch[1]);

  // Static / constructor access: ClassName.something or ClassName.new()
  const staticAccessRegex = /\b([A-Z]\w*)\s*\./g;
  while ((match = staticAccessRegex.exec(line)) !== null) push(match[1]);

  // Type-check and cast: if x is ClassName / x as ClassName
  const isAsRegex = /\b(?:is|as)\s+([A-Z]\w*)/g;
  while ((match = isAsRegex.exec(line)) !== null) push(match[1]);

  // Typed array/dictionary generics: Array[ClassName], Dictionary[K, ClassName]
  const genericRegex = /\[([A-Z]\w*)(?:,\s*([A-Z]\w*))?\]/g;
  while ((match = genericRegex.exec(line)) !== null) {
    push(match[1]);
    if (match[2]) push(match[2]);
  }

  return references;
}

const rule: IRuleDetector<GDScriptRuleContext> = { id: 'class-name-usage', detect };
export default rule;
