import { resolvePythonModulePath as readPythonModulePath } from './python/paths';
import { resolveRustModuleDeclarationPath as readRustModuleDeclarationPath } from './rust/moduleDeclarationPath';
import { resolveRustUsePath as readRustUsePath } from './rust/usePath';

export const resolvePythonModulePath = readPythonModulePath;
export const resolveRustModuleDeclarationPath = readRustModuleDeclarationPath;
export const resolveRustUsePath = readRustUsePath;
