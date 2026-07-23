import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { CodeGraphyWorkspaceSettings } from './settings';

export type CodeGraphyWorkspaceStatusState = 'fresh' | 'stale' | 'missing';
export type CodeGraphyWorkspaceStaleReason =
  | 'never-indexed'
  | 'graph-cache-missing'
  | 'plugin-signature-changed'
  | 'settings-signature-changed'
  | 'analysis-version-changed'
  | 'pending-changed-files';

export interface CodeGraphyWorkspaceStatus {
  workspaceRoot: string;
  graphCachePath: string;
  state: CodeGraphyWorkspaceStatusState;
  hasGraphCache: boolean;
  staleReasons: CodeGraphyWorkspaceStaleReason[];
  detail: string;
}

export interface ReadCodeGraphyWorkspaceStatusOptions {
  plugins?: ReadonlyArray<Pick<IPlugin, 'id' | 'version'>>;
  pluginSignature?: string | null;
  pluginBuildSignature?: string | null;
  settings?: CodeGraphyWorkspaceSettings;
  settingsSignature?: string;
  exists?: (filePath: string) => boolean;
  userHomeDir?: string;
}
