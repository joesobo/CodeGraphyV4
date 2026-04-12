import type { IAnalysisRelation } from '@codegraphy-vscode/plugin-api';
import type { IDetectedImport } from '../PathResolver';
import type { PythonRuleContext } from '../context';

function detect(
  _content: string,
  filePath: string,
  ctx: PythonRuleContext
): IAnalysisRelation[] {
  const relations: IAnalysisRelation[] = [];

  for (const entry of ctx.imports) {
    if (entry.kind !== 'import') continue;

    const imp: IDetectedImport = {
      module: entry.module,
      isRelative: false,
      relativeLevel: 0,
      type: 'import',
      line: entry.line,
    };
    const resolvedPath = ctx.resolver.resolve(imp, filePath);

    relations.push({
      kind: 'import',
      specifier: entry.module,
      resolvedPath,
      type: 'static',
      sourceId: 'import-module',
      fromFilePath: filePath,
      toFilePath: resolvedPath,
    });
  }

  return relations;
}

const rule = {
  id: 'import-module',
  detect,
};

export default rule;
export { detect };
