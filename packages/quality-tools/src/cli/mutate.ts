#!/usr/bin/env tsx

import { runMutationCli } from '../mutation/runner/command';

await runMutationCli(process.argv.slice(2));
