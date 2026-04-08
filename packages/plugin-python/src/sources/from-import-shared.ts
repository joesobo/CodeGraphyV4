import type { IConnection } from '@codegraphy-vscode/plugin-api';
import type { IDetectedImport } from '../PathResolver';
import type { ParsedPythonImport } from '../astParser';
import type { PythonRuleContext } from '../context';

export function buildFromImportConnections(
  filePath: string,
  entry: Extract<ParsedPythonImport, { kind: 'from' }>,
  ctx: PythonRuleContext,
  sourceId: string
): IConnection[] {
  const connections: IConnection[] = [];

  const baseImport: IDetectedImport = {
    module: entry.module,
    names: entry.names,
    isRelative: entry.level > 0,
    relativeLevel: entry.level,
    type: 'from',
    line: entry.line,
  };

  const moduleSpecifier = '.'.repeat(entry.level) + entry.module;
  const baseResolved = ctx.resolver.resolve(baseImport, filePath);

  for (const importedName of entry.names) {
    if (importedName === '*') {
      connections.push({
        kind: 'import',
        specifier: `from ${moduleSpecifier} import *`,
        resolvedPath: ctx.resolver.resolve(baseImport, filePath),
        type: 'static',
        sourceId,
      });
      continue;
    }

    const memberImport: IDetectedImport = {
      ...baseImport,
      module: entry.module ? `${entry.module}.${importedName}` : importedName,
      names: undefined,
    };
    const memberResolved = ctx.resolver.resolve(memberImport, filePath);
    const resolvedPath = memberResolved ?? baseResolved;

    connections.push({
      kind: 'import',
      specifier: `from ${moduleSpecifier} import ${importedName}`,
      resolvedPath,
      type: 'static',
      sourceId,
    });
  }

  return connections;
}
