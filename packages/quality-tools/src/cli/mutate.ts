#!/usr/bin/env tsx

import { runMutationCli } from '../mutation/runner/command';

runMutationCli(process.argv.slice(2));
