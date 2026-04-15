export { resolveGoPackagePath } from './projectRoots/goPackagePath';
export { readGoModuleName, resolveGoPackageDirectory } from './projectRoots/goModule';
export { resolveJavaSourceRoot, resolveJavaTypePath } from './projectRoots/java';
export { getPythonSearchRoots } from './projectRoots/python';
export { getRustCrateRoot } from './projectRoots/rust';
export { dedupePaths, findNearestProjectRoot } from './projectRoots/shared';
