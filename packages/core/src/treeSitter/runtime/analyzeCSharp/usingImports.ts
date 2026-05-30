import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import { resolveCSharpTypePathInNamespace } from '../csharpIndex';
import { normalizeCSharpTypeName } from './resolution';
import { addImportRelation } from '../analyze/results';
import {
  getRelationshipEvidenceSpecifier,
  materializeRelationshipTargetPath,
} from '../../../analysis/relationshipEvidence';

type CSharpUsingTargetRelation = IAnalysisRelationshipEvidence & {
  target: IAnalysisRelationshipEvidence['target'] & { kind: 'file' };
};

function isCSharpUsingTargetRelation(relation: IAnalysisRelationshipEvidence): relation is CSharpUsingTargetRelation {
  return (
    (relation.edgeType === 'reference' || relation.edgeType === 'inherit')
    && relation.target.kind === 'file'
    && Boolean(getRelationshipEvidenceSpecifier(relation))
  );
}

function appendMatchedUsingTargets(
  workspaceRoot: string,
  filePath: string,
  relations: IAnalysisRelationshipEvidence[],
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
): void {
  for (const relation of relations) {
    if (!isCSharpUsingTargetRelation(relation)) {
      continue;
    }

    for (const namespaceName of usingNamespaces) {
      const resolvedPath = materializeRelationshipTargetPath(relation.target, workspaceRoot);
      if (!resolvedPath) {
        continue;
      }
      const expectedPath = resolveCSharpTypePathInNamespace(
        workspaceRoot,
        filePath,
        namespaceName,
        normalizeCSharpTypeName(getRelationshipEvidenceSpecifier(relation)),
      );
      if (expectedPath === resolvedPath) {
        const paths = importTargetsByNamespace.get(namespaceName) ?? new Set<string>();
        paths.add(resolvedPath);
        importTargetsByNamespace.set(namespaceName, paths);
      }
    }
  }
}

function appendNamespaceImportRelations(
  filePath: string,
  relations: IAnalysisRelationshipEvidence[],
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
  relations: IAnalysisRelationshipEvidence[],
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
