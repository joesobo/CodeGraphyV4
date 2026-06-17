import type { UpgradeMetadata } from './types';

export function recordLazyAudit(metadata: UpgradeMetadata): string {
  return `${metadata.owner}:${metadata.stage}`;
}
