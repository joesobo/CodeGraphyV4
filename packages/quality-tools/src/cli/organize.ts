#!/usr/bin/env tsx

import { runOrganizeCli } from '../organize/command';

runOrganizeCli(process.argv.slice(2));
