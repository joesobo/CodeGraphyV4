/**
 * @fileoverview Intra-namespace type usage detection rule.
 * Finds connections between files in the same namespace: new Type(), Type.Method(), : Type.
 * @module plugins/csharp/rules/type-usage
 */

import type { IConnection, IRuleDetector } from '@codegraphy/plugin-api';
import type { CSharpRuleContext } from '../parser';

/** Detects intra-namespace type usage: same namespace, no using needed */
export function detect(_content: string, filePath: string, ctx: CSharpRuleContext): IConnection[] {
  const connections: IConnection[] = [];

  for (const ns of ctx.namespaces) {
    const intraNsConnections = ctx.resolver.resolveIntraNamespace(ns.name, filePath, ctx.usedTypes);
    for (const resolvedPath of intraNsConnections) {
      connections.push({
        specifier: `[same namespace: ${ns.name}]`,
        resolvedPath,
        type: 'static',
        ruleId: 'type-usage',
      });
    }
  }

  return connections;
}

const rule: IRuleDetector<CSharpRuleContext> = { id: 'type-usage', detect };
export default rule;
