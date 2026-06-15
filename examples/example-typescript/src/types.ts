export enum RolloutStage {
  Preview = 'preview',
  Beta = 'beta',
  Stable = 'stable',
}

export type RolloutRequest = {
  userId: string;
  requestedAt: Date;
};

export interface FeatureFlag {
  key: string;
  stage: RolloutStage;
  percentage: number;
}

export type RolloutDecision = {
  featureKey: string;
  enabled: boolean;
  reason: string;
};

export function describeStage(stage: RolloutStage): string {
  return `rollout:${stage}`;
}
