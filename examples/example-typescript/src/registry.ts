import type { UpgradeMetadata } from './types';

export function createAuditRecord(metadata: UpgradeMetadata): string {
  return `audit:${metadata.owner}:${metadata.stage}`;
}
