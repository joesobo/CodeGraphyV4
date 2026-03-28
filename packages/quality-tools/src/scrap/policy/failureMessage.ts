import { type ScrapPolicyPreset } from './resolve';

export function policyFailureMessage(policy: ScrapPolicyPreset): string | undefined {
  if (policy === 'split') {
    return 'SCRAP split policy failed: split files are present.';
  }

  if (policy === 'review') {
    return 'SCRAP review policy failed: review-first files are present.';
  }

  if (policy === 'strict') {
    return 'SCRAP strict mode failed: split or review-first files are present.';
  }

  return undefined;
}
