import { EXTENSION_RUNTIME_PACKAGE_NAMES } from './runtimePackages';

export {
  copyRuntimePackage,
  EXTENSION_RUNTIME_PACKAGE_NAMES,
  getVendoredPackageRootPath,
  resolveRuntimePackageRootPath,
  syncExtensionRuntimePackages,
} from './runtimePackages';

export const EXTENSION_EXTERNAL_PACKAGE_NAMES = [
  'vscode',
  ...EXTENSION_RUNTIME_PACKAGE_NAMES,
] as const;
