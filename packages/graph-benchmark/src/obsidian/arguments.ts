import {
  DEFAULT_SYNTHETIC_FIXTURE_SEED,
  isSyntheticFixtureName,
  type SyntheticFixtureName,
} from '../fixture/presets';

export interface ObsidianVaultArguments {
  fixture: SyntheticFixtureName;
  seed: number;
  outputDirectory: string;
}

export function parseObsidianVaultArguments(
  arguments_: readonly string[],
): ObsidianVaultArguments {
  let fixture: SyntheticFixtureName | undefined;
  let seed = DEFAULT_SYNTHETIC_FIXTURE_SEED;
  let outputDirectory: string | undefined;

  for (let index = 0; index < arguments_.length; index += 2) {
    const option = arguments_[index];
    const value = arguments_[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${option} requires a value`);

    if (option === '--fixture') {
      if (!isSyntheticFixtureName(value)) throw new Error(`Unknown fixture: ${value}`);
      fixture = value;
    } else if (option === '--seed') {
      const parsedSeed = Number(value);
      if (!Number.isSafeInteger(parsedSeed) || parsedSeed < 0) {
        throw new Error('--seed must be a non-negative integer');
      }
      seed = parsedSeed;
    } else if (option === '--output') {
      outputDirectory = value;
    } else {
      throw new Error(`Unknown Obsidian vault option: ${option}`);
    }
  }

  if (!fixture) throw new Error('--fixture is required');
  if (!outputDirectory) throw new Error('--output is required');
  return { fixture, seed, outputDirectory };
}
