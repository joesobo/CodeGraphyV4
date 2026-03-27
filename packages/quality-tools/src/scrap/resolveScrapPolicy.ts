import { flagValue } from '../shared/cliArgs';

export type ScrapPolicyPreset = 'advisory' | 'review' | 'split' | 'strict';

export function resolveScrapPolicy(args: string[]): ScrapPolicyPreset {
  const preset = flagValue(args, '--policy');
  if (preset === 'strict' || preset === 'advisory' || preset === 'review' || preset === 'split') {
    return preset;
  }

  if (preset !== undefined) {
    throw new Error(`Unknown SCRAP policy preset: ${preset}`);
  }

  return args.includes('--strict') ? 'strict' : 'advisory';
}
