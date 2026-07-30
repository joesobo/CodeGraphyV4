import { EXTENSION_RUNTIME_PACKAGE_NAMES } from './runtimeStaging/model';

export {
  copyRuntimePackage,
  EXTENSION_RUNTIME_PACKAGE_NAMES,
  EXTENSION_RUNTIME_TARGETS,
  getExtensionRuntimePackageNames,
  getVendoredPackageRootPath,
  resolveExtensionRuntimeTarget,
  resolveRuntimePackageRootPath,
  syncExtensionRuntimePackages,
  syncParticlesRuntimePackages,
} from './runtimeStaging/model';

export const EXTENSION_EXTERNAL_PACKAGE_NAMES = [
  'vscode',
  ...EXTENSION_RUNTIME_PACKAGE_NAMES,
] as const;
