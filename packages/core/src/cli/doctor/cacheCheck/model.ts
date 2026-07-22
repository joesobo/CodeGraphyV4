import { WORKSPACE_ANALYSIS_CACHE_VERSION } from '../../../analysis/cache';
import type { WorkspaceAnalysisDatabaseInspection } from '../../../graphCache/database/storage';
import type { CodeGraphyWorkspaceStatus } from '../../../workspace/status';

export interface DoctorCacheCheckInput {
  status: Pick<CodeGraphyWorkspaceStatus, 'state' | 'graphCachePath' | 'staleReasons'>;
  inspection: WorkspaceAnalysisDatabaseInspection;
  indexedAt: string | null;
}

export interface DoctorCacheCheck {
  ok: boolean;
  state: CodeGraphyWorkspaceStatus['state'];
  path: string;
  staleReasons: CodeGraphyWorkspaceStatus['staleReasons'];
  schemaVersion: WorkspaceAnalysisDatabaseInspection['schemaVersion'];
  expectedSchemaVersion: number;
  schemaCompatible: boolean;
  integrityOk: boolean;
  foreignKeyOk: boolean;
  analysisVersion: string;
  indexedAt: string | null;
  records: WorkspaceAnalysisDatabaseInspection['records'];
  message?: string;
  action?: string;
}

export function createDoctorCacheCheck(input: DoctorCacheCheckInput): DoctorCacheCheck {
  const healthy = input.status.state === 'fresh' && input.inspection.ok;
  return {
    ok: healthy,
    state: input.status.state,
    path: input.status.graphCachePath,
    staleReasons: input.status.staleReasons,
    schemaVersion: input.inspection.schemaVersion,
    expectedSchemaVersion: input.inspection.expectedSchemaVersion,
    schemaCompatible: input.inspection.schemaCompatible,
    integrityOk: input.inspection.integrityOk,
    foreignKeyOk: input.inspection.foreignKeyOk,
    analysisVersion: WORKSPACE_ANALYSIS_CACHE_VERSION,
    indexedAt: input.indexedAt,
    records: input.inspection.records,
    ...(input.inspection.message ? { message: input.inspection.message } : {}),
    ...(healthy ? {} : { action: 'Run `codegraphy index`.' }),
  };
}
