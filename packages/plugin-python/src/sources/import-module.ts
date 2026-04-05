import type { IConnection, IConnectionDetector } from '@codegraphy-vscode/plugin-api';
import type { IDetectedImport } from '../PathResolver';
import type { PythonRuleContext } from '../context';

function detect(
  _content: string,
  filePath: string,
  ctx: PythonRuleContext
): IConnection[] {
  const connections: IConnection[] = [];

  for (const entry of ctx.imports) {
    if (entry.kind !== 'import') continue;

    const imp: IDetectedImport = {
      module: entry.module,
      isRelative: false,
      relativeLevel: 0,
      type: 'import',
      line: entry.line,
    };

    connections.push({
      kind: 'import',
      specifier: entry.module,
      resolvedPath: ctx.resolver.resolve(imp, filePath),
      type: 'static',
      sourceId: 'import-module',
    });
  }

  return connections;
}

const rule: IConnectionDetector<PythonRuleContext> = {
  id: 'import-module',
  detect,
};

export default rule;
export { detect };
