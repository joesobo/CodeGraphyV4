import { resolveGoPackagePath as resolveGoPath } from './projectRoots/go/packagePath';
import {
  readGoModuleName as readModuleName,
  resolveGoPackageDirectory as resolveGoDirectory,
} from './projectRoots/go/module';
import {
  resolveJavaSourceRoot as resolveSourceRoot,
  resolveJavaTypePath as resolveTypePath,
} from './projectRoots/java';
import { getPythonSearchRoots as readPythonSearchRoots } from './projectRoots/python';
import { getRustCrateRoot as readRustCrateRoot } from './projectRoots/rust';
import { dedupePaths as dedupeProjectRootPaths, findNearestProjectRoot as findProjectRoot } from './projectRoots/rootSearch';

export const resolveGoPackagePath = resolveGoPath;
export const readGoModuleName = readModuleName;
export const resolveGoPackageDirectory = resolveGoDirectory;
export const resolveJavaSourceRoot = resolveSourceRoot;
export const resolveJavaTypePath = resolveTypePath;
export const getPythonSearchRoots = readPythonSearchRoots;
export const getRustCrateRoot = readRustCrateRoot;
export const dedupePaths = dedupeProjectRootPaths;
export const findNearestProjectRoot = findProjectRoot;
