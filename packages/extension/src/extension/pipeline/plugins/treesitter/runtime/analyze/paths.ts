import { resolvePythonModulePath as readPythonModulePath } from './python/paths';
import { resolveRustModuleDeclarationPath as readRustModuleDeclarationPath } from './rust/analysis/moduleDeclarationPath';
import { resolveRustUsePath as readRustUsePath } from './rust/analysis/usePath';

export const resolvePythonModulePath = readPythonModulePath;
export const resolveRustModuleDeclarationPath = readRustModuleDeclarationPath;
export const resolveRustUsePath = readRustUsePath;
