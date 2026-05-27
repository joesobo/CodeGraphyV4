import {
  readCodeGraphyWorkspaceStatusForCli,
  requestCodeGraphyIndexWorkspace,
  requestWorkspaceGraphQuery,
} from '@codegraphy-dev/core';
import type { CodeGraphyMcpServerDependencies } from './contracts';

export const DEFAULT_DEPENDENCIES: CodeGraphyMcpServerDependencies = {
  cwd: () => process.cwd(),
  indexWorkspace: requestCodeGraphyIndexWorkspace,
  runGraphQuery: requestWorkspaceGraphQuery,
  statusWorkspace: readCodeGraphyWorkspaceStatusForCli,
};
