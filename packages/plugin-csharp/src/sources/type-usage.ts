/**
 * @fileoverview Intra-namespace type usage detection rule.
 * Finds connections between files in the same namespace: new Type(), Type.Method(), : Type.
 * @module plugins/csharp/sources/type-usage
 */

import type { IConnection, IConnectionDetector } from '@codegraphy-vscode/plugin-api';
import type { CSharpRuleContext } from '../parserTypes';

function getSourceId(): string {
  return 'type-usage';
}

/** Detects intra-namespace type usage: same namespace, no using needed */
export function detect(_content: string, filePath: string, ctx: CSharpRuleContext): IConnection[] {
  const connections: IConnection[] = [];

  for (const ns of ctx.namespaces) {
    const intraNsConnections = ctx.resolver.resolveIntraNamespace(ns.name, filePath, ctx.usedTypes);
    for (const resolvedPath of intraNsConnections) {
      connections.push({
        kind: 'reference',
        specifier: `[same namespace: ${ns.name}]`,
        resolvedPath,
        type: 'static',
        sourceId: getSourceId(),
      });
    }
  }

  return connections;
}

class TypeUsageRule implements IConnectionDetector<CSharpRuleContext> {
  get id(): string {
    return getSourceId();
  }

  readonly detect = detect;
}

const rule = new TypeUsageRule();
export default rule;
