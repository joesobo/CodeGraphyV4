import type { IAnalysisRelation } from '../../../../../../core/plugins/types/contracts';
import { resolveCSharpTypePathInNamespace } from '../csharpIndex';
import { normalizeCSharpTypeName } from './resolution';
import { addImportRelation } from '../analyze/results';

type CSharpUsingTargetRelation = IAnalysisRelation & {
  resolvedPath: string;
  specifier: string;
};

function isCSharpUsingTargetRelation(relation: IAnalysisRelation): relation is CSharpUsingTargetRelation {
  return (
    (relation.kind === 'reference' || relation.kind === 'inherit')
    && Boolean(relation.resolvedPath)
    && Boolean(relation.specifier)
  );
}

function appendMatchedUsingTargets(
  workspaceRoot: string,
  filePath: string,
  relations: IAnalysisRelation[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
): void {
  for (const relation of relations) {
    if (!isCSharpUsingTargetRelation(relation)) {
      continue;
    }

    for (const namespaceName of usingNamespaces) {
      const expectedPath = resolveCSharpTypePathInNamespace(
        workspaceRoot,
        filePath,
        namespaceName,
        normalizeCSharpTypeName(relation.specifier),
      );
      if (expectedPath === relation.resolvedPath) {
        const paths = importTargetsByNamespace.get(namespaceName) ?? new Set<string>();
        paths.add(relation.resolvedPath);
        importTargetsByNamespace.set(namespaceName, paths);
      }
    }
  }
}

function appendNamespaceImportRelations(
  filePath: string,
  relations: IAnalysisRelation[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
): void {
  for (const namespaceName of usingNamespaces) {
    const targetPaths = importTargetsByNamespace.get(namespaceName);
    if (!targetPaths || targetPaths.size === 0) {
      addImportRelation(relations, filePath, namespaceName, null);
      continue;
    }

    for (const targetPath of targetPaths) {
      addImportRelation(relations, filePath, namespaceName, targetPath);
    }
  }
}

export function appendCSharpUsingImportRelations(
  workspaceRoot: string,
  filePath: string,
  relations: IAnalysisRelation[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
): void {
  appendMatchedUsingTargets(
    workspaceRoot,
    filePath,
    relations,
    usingNamespaces,
    importTargetsByNamespace,
  );
  appendNamespaceImportRelations(
    filePath,
    relations,
    usingNamespaces,
    importTargetsByNamespace,
  );
}
