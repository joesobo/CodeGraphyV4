import type { ICodeGraphyRepoMeta } from '../meta';
import type { CodeGraphyIndexStaleReason } from './model';

function collectSignatureReasons(input: {
  meta: ICodeGraphyRepoMeta;
  pluginSignature: string | null;
  settingsSignature: string;
}): CodeGraphyIndexStaleReason[] {
  const { meta, pluginSignature, settingsSignature } = input;
  return [
    ...(meta.pendingChangedFiles.length > 0 ? ['pending-changed-files' as const] : []),
    ...(meta.pluginSignature !== pluginSignature ? ['plugin-signature-changed' as const] : []),
    ...(meta.settingsSignature !== settingsSignature ? ['settings-signature-changed' as const] : []),
  ];
}

function getCommitReason(
  indexedCommit: string | null,
  currentCommit: string | null,
): CodeGraphyIndexStaleReason | null {
  if (currentCommit === null) {
    return indexedCommit === null ? null : 'current-commit-unavailable';
  }

  if (indexedCommit === null) {
    return 'missing-indexed-commit';
  }

  return indexedCommit === currentCommit ? null : 'commit-changed';
}

export function collectStaleReasons(input: {
  meta: ICodeGraphyRepoMeta;
  currentCommit: string | null;
  pluginSignature: string | null;
  settingsSignature: string;
}): CodeGraphyIndexStaleReason[] {
  const signatureReasons = collectSignatureReasons(input);
  const commitReason = getCommitReason(input.meta.lastIndexedCommit, input.currentCommit);
  return commitReason === null ? signatureReasons : [...signatureReasons, commitReason];
}
