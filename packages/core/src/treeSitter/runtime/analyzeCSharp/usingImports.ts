import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { resolveCSharpTypePathInNamespace } from '../csharpIndex';
import { normalizeCSharpTypeName } from './resolution';
import { addRelation } from '../analyze/results';
import { TREE_SITTER_SOURCE_IDS } from '../languages';

type CSharpUsingTargetRelation = IAnalysisRelation & {
  resolvedPath: string;
  specifier: string;
};

function isCSharpUsingTargetRelation(relation: IAnalysisRelation): relation is CSharpUsingTargetRelation {
  return (
    (
      relation.kind === 'type'
      || relation.kind === 'call'
      || relation.kind === 'implements'
      || relation.kind === 'inherit'
    )
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
      addCSharpUsingRelation(relations, filePath, namespaceName, null);
      continue;
    }

    for (const targetPath of targetPaths) {
      addCSharpUsingRelation(relations, filePath, namespaceName, targetPath);
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

function addCSharpUsingRelation(
  relations: IAnalysisRelation[],
  filePath: string,
  specifier: string,
  resolvedPath: string | null,
): void {
  addRelation(relations, {
    kind: 'using',
    sourceId: TREE_SITTER_SOURCE_IDS.using,
    fromFilePath: filePath,
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
  });
}
