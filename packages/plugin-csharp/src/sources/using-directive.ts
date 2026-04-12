/**
 * @fileoverview Using directive detection rule.
 * Finds `using System;`, `using static System.Math;`, `global using X;`, `using Alias = X;`.
 * @module plugins/csharp/sources/using-directive
 */

import type { IAnalysisRelation } from '@codegraphy-vscode/plugin-api';
import type { CSharpRuleContext } from '../parserTypes';

function getSourceId(): string {
  return 'using-directive';
}

/** Detects using directive connections: using System; using static X; global using X; */
export function detect(_content: string, filePath: string, ctx: CSharpRuleContext): IAnalysisRelation[] {
  const relations: IAnalysisRelation[] = [];

  for (const using of ctx.usings) {
    const resolvedPaths = ctx.resolver.resolveWithTypes(using, filePath, ctx.usedTypes);

    for (const resolvedPath of resolvedPaths) {
      let specifier = using.namespace;
      if (using.isGlobal) specifier = `global using ${specifier}`;
      else if (using.isStatic) specifier = `using static ${specifier}`;
      else if (using.alias) specifier = `using ${using.alias} = ${specifier}`;
      else specifier = `using ${specifier}`;

      relations.push({
        kind: 'import',
        specifier,
        resolvedPath,
        type: 'static',
        sourceId: getSourceId(),
        fromFilePath: filePath,
        toFilePath: resolvedPath,
      });
    }
  }

  return relations;
}

class UsingDirectiveRule {
  get id(): string {
    return getSourceId();
  }

  readonly detect = detect;
}

const rule = new UsingDirectiveRule();
export default rule;
