/**
 * @fileoverview Using directive detection rule.
 * Finds `using System;`, `using static System.Math;`, `global using X;`, `using Alias = X;`.
 * @module plugins/csharp/sources/using-directive
 */

import type { IConnection, IConnectionDetector } from '@codegraphy-vscode/plugin-api';
import type { CSharpRuleContext } from '../parser';

/** Detects using directive connections: using System; using static X; global using X; */
export function detect(_content: string, filePath: string, ctx: CSharpRuleContext): IConnection[] {
  const connections: IConnection[] = [];

  for (const using of ctx.usings) {
    const resolvedPaths = ctx.resolver.resolveWithTypes(using, filePath, ctx.usedTypes);

    for (const resolvedPath of resolvedPaths) {
      let specifier = using.namespace;
      if (using.isGlobal) specifier = `global using ${specifier}`;
      else if (using.isStatic) specifier = `using static ${specifier}`;
      else if (using.alias) specifier = `using ${using.alias} = ${specifier}`;
      else specifier = `using ${specifier}`;

      connections.push({
        kind: 'import',
        specifier,
        resolvedPath,
        type: 'static',
        sourceId: 'using-directive',
      });
    }
  }

  return connections;
}

const rule: IConnectionDetector<CSharpRuleContext> = { id: 'using-directive', detect };
export default rule;
