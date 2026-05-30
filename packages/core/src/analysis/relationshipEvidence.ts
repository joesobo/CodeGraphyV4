import * as path from 'path';
import type {
  IAnalysisRelationshipEvidence,
  IAnalysisRelationshipTarget,
} from '@codegraphy-dev/plugin-api';

export function getRelationshipEvidenceSourceFilePath(
  evidence: IAnalysisRelationshipEvidence,
  analysisFilePath: string,
): string {
  if (evidence.from?.kind === 'file' && evidence.from.filePath) {
    return evidence.from.filePath;
  }

  if (evidence.from?.kind === 'symbol' && evidence.from.filePath) {
    return evidence.from.filePath;
  }

  return analysisFilePath;
}

export function getRelationshipEvidenceSpecifier(evidence: IAnalysisRelationshipEvidence): string {
  return evidence.specifier ?? evidence.target.specifier ?? '';
}

export function materializeRelationshipTargetPath(
  target: IAnalysisRelationshipTarget,
  workspaceRoot: string,
): string | null {
  if (target.kind === 'symbol') {
    return target.filePath ? path.normalize(target.filePath) : null;
  }

  if (target.kind !== 'file') {
    return null;
  }

  if (target.pathKind === 'absolute' || path.isAbsolute(target.path)) {
    return path.normalize(target.path);
  }

  return path.normalize(path.join(workspaceRoot, target.path));
}

export function getRelationshipEvidenceTargetNodeId(evidence: IAnalysisRelationshipEvidence): string | undefined {
  return evidence.target.kind === 'node' ? evidence.target.nodeId : undefined;
}

export function getRelationshipEvidenceTargetSymbolId(evidence: IAnalysisRelationshipEvidence): string | undefined {
  return evidence.target.kind === 'symbol' ? evidence.target.symbolId : undefined;
}

export function getRelationshipEvidenceSourceNodeId(evidence: IAnalysisRelationshipEvidence): string | undefined {
  return evidence.from?.kind === 'node' ? evidence.from.nodeId : undefined;
}

export function getRelationshipEvidenceSourceSymbolId(evidence: IAnalysisRelationshipEvidence): string | undefined {
  return evidence.from?.kind === 'symbol' ? evidence.from.symbolId : undefined;
}
