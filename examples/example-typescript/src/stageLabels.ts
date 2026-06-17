import type { UpgradeStage } from './types';

const StageLabels = {
  describeStage(stage: UpgradeStage): string {
    return `stage:${stage}`;
  },
};

export default StageLabels;
