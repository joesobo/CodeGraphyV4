import type { IConnection, IRuleDetector } from '@codegraphy-vscode/plugin-api';
import type { PythonRuleContext } from '../context';
import { buildFromImportConnections } from './from-import-shared';

function detect(
  _content: string,
  filePath: string,
  ctx: PythonRuleContext
): IConnection[] {
  const connections: IConnection[] = [];

  for (const entry of ctx.imports) {
    if (entry.kind !== 'from') continue;
    if (entry.level <= 0) continue;

    connections.push(
      ...buildFromImportConnections(filePath, entry, ctx, 'from-import-relative'),
    );
  }

  return connections;
}

const rule: IRuleDetector<PythonRuleContext> = {
  id: 'from-import-relative',
  detect,
};

export default rule;
export { detect };
