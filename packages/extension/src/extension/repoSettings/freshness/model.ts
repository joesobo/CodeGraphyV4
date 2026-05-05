export type CodeGraphyIndexFreshness = 'fresh' | 'stale' | 'missing';
export type CodeGraphyIndexStaleReason =
  | 'never-indexed'
  | 'plugin-signature-changed'
  | 'settings-signature-changed'
  | 'missing-indexed-commit'
  | 'commit-changed'
  | 'current-commit-unavailable'
  | 'pending-changed-files';

export interface CodeGraphyIndexStatus {
  freshness: CodeGraphyIndexFreshness;
  hasIndex: boolean;
  staleReasons: CodeGraphyIndexStaleReason[];
  detail: string;
}
