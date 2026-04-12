import type { IAnalysisRelation } from '@codegraphy-vscode/plugin-api';
import type { PythonRuleContext } from '../context';
import { buildFromImportRelations } from './from-import-shared';

function detect(
  _content: string,
  filePath: string,
  ctx: PythonRuleContext
): IAnalysisRelation[] {
  const relations: IAnalysisRelation[] = [];

  for (const entry of ctx.imports) {
    if (entry.kind !== 'from') continue;
    if (entry.level <= 0) continue;

    relations.push(
      ...buildFromImportRelations(filePath, entry, ctx, 'from-import-relative'),
    );
  }

  return relations;
}

const rule = {
  id: 'from-import-relative',
  detect,
};

export default rule;
export { detect };
