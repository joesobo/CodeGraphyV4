import { RolloutStage, type FeatureFlag } from './types';

export const checkoutFlag: FeatureFlag = {
  key: 'checkout-redesign',
  stage: RolloutStage.Beta,
  percentage: 25,
};
