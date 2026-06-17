import { getSummaryTarget } from './summary';
import { formatUser, UpgradeStage } from './types';

export function buildRolloutSummary(projectName: string): string {
  return `${formatUser(projectName)} is in ${UpgradeStage.Acceptance} with ${getSummaryTarget()}`;
}
