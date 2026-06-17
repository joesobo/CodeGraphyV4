import { buildAliasNotice } from '#example/notification';
import StageLabels from './stageLabels';
import { formatUser } from './types';
import type { ProjectName, UpgradeMetadata } from './types';
import { buildRolloutSummary } from './utils';

export const currentProject: ProjectName = formatUser('TypeScript Upgrade');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const legacySettings = require('./legacySettings');

export { createAuditRecord } from './registry';

const scheduleFollowUp = async (metadata: UpgradeMetadata): Promise<void> => {
  const lazyAudit = await import('./lazyAudit');
  lazyAudit.recordLazyAudit(metadata);
};

console.log(buildRolloutSummary(currentProject));
console.log(buildAliasNotice(currentProject));
console.log(StageLabels.describeStage(legacySettings.stage));
void scheduleFollowUp({ owner: currentProject, stage: legacySettings.stage });
