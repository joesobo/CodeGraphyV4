import type { ICodeGraphyRepoMeta } from '../meta';
import { filterWorkspaceStatusPendingChangedFiles } from '@codegraphy-dev/core';
import {
  createFreshDetail,
  createMissingDetail,
  createStaleDetail,
} from './details';
import type { CodeGraphyIndexStatus } from './model';
import { collectStaleReasons } from './reasons';

export type {
  CodeGraphyIndexFreshness,
  CodeGraphyIndexStaleReason,
  CodeGraphyIndexStatus,
} from './model';

function createFreshStatus(): CodeGraphyIndexStatus {
  return {
    freshness: 'fresh',
    hasIndex: true,
    staleReasons: [],
    detail: createFreshDetail(),
  };
}

function createMissingStatus(): CodeGraphyIndexStatus {
  return {
    freshness: 'missing',
    hasIndex: false,
    staleReasons: ['never-indexed'],
    detail: createMissingDetail(),
  };
}

export function evaluateCodeGraphyIndexStatus(input: {
  meta: ICodeGraphyRepoMeta;
  currentCommit: string | null;
  pluginSignature: string | null;
  settingsSignature: string;
}): CodeGraphyIndexStatus {
  const { meta, currentCommit, pluginSignature, settingsSignature } = input;
  const pendingChangedFiles = filterWorkspaceStatusPendingChangedFiles(
    meta.pendingChangedFiles,
    { lastIndexedAt: meta.lastIndexedAt },
  );
  const statusMeta = {
    ...meta,
    pendingChangedFiles,
  };

  if (meta.lastIndexedAt === null) {
    return createMissingStatus();
  }

  const staleReasons = collectStaleReasons({
    meta: statusMeta,
    currentCommit,
    pluginSignature,
    settingsSignature,
  });
  if (staleReasons.length === 0) {
    return createFreshStatus();
  }

  return {
    freshness: 'stale',
    hasIndex: false,
    staleReasons,
    detail: createStaleDetail(staleReasons, pendingChangedFiles),
  };
}
