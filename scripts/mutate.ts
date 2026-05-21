#!/usr/bin/env tsx

import { runCodeGraphyMutationCli } from './mutation/codegraphyMutate';

void runCodeGraphyMutationCli(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
