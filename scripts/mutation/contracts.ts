export interface MutationSeedJob {
  mutate: string[];
  package: string;
  shard: string;
  testIncludes: string[];
}

export interface MutationSeedJobMatrixEntry {
  package: string;
  shard: string;
}
