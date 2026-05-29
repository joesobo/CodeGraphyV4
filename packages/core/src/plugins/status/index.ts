export type {
  WorkspaceIndexPluginStatus,
  WorkspaceIndexPluginStatusOptions,
} from './contracts';
export { buildWorkspaceIndexPluginStatuses } from './build';
export { countWorkspaceIndexPluginConnections } from './connectionCounts';
export {
  getWorkspaceIndexPluginMatchingFiles,
  supportsWorkspaceIndexPluginExtension,
} from './extensions';
export {
  buildRegisteredWorkspaceIndexPluginStatus,
  buildUnregisteredInstalledWorkspaceIndexPluginStatus,
  getRegisteredWorkspaceIndexPluginPackageNames,
  isUserFacingWorkspaceIndexPlugin,
} from './records';
export {
  getWorkspaceIndexPluginNameForFile,
  getWorkspaceIndexPluginStatuses,
  resolveWorkspaceIndexPluginNameForFile,
  type WorkspaceIndexPluginStatusDependencies,
} from './queries';
