import { createDiagnosticEvent } from '../diagnostics/events';
import type { WorkspaceGraphQueryInput } from './requestTypes';
import type { readCodeGraphyWorkspaceStatus } from './status';

type WorkspaceStatus = ReturnType<typeof readCodeGraphyWorkspaceStatus>;

export function emitGraphQueryStarted(input: {
  diagnostics: WorkspaceGraphQueryInput['diagnostics'];
  operationId: string;
  report: WorkspaceGraphQueryInput['report'];
  workspaceRoot: string;
}): void {
  input.diagnostics?.emit(createDiagnosticEvent({
    area: 'graph-query',
    event: 'started',
    context: {
      operationId: input.operationId,
      workspaceRoot: input.workspaceRoot,
      report: input.report,
    },
  }));
}

export function emitGraphQueryCacheMissing(input: {
  diagnostics: WorkspaceGraphQueryInput['diagnostics'];
  operationId: string;
  report: WorkspaceGraphQueryInput['report'];
  status: WorkspaceStatus;
  workspaceRoot: string;
}): void {
  input.diagnostics?.emit(createDiagnosticEvent({
    area: 'graph-query',
    event: 'cache-missing',
    context: {
      operationId: input.operationId,
      workspaceRoot: input.workspaceRoot,
      report: input.report,
      cacheState: input.status.state,
      staleReasons: input.status.staleReasons,
    },
  }));
}

export function emitGraphQueryCompleted(input: {
  diagnostics: WorkspaceGraphQueryInput['diagnostics'];
  durationMs: number;
  edgeCount: number;
  nodeCount: number;
  operationId: string;
  report: WorkspaceGraphQueryInput['report'];
  status: WorkspaceStatus;
}): void {
  input.diagnostics?.emit(createDiagnosticEvent({
    area: 'graph-query',
    event: 'completed',
    context: {
      operationId: input.operationId,
      report: input.report,
      cacheState: input.status.state,
      staleReasons: input.status.staleReasons,
      nodeCount: input.nodeCount,
      edgeCount: input.edgeCount,
      durationMs: input.durationMs,
    },
  }));
}
